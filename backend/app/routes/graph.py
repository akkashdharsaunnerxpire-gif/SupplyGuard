from fastapi import APIRouter, HTTPException
from app.database import driver

router = APIRouter(
    prefix="/api/graph",
    tags=["Graph"]
)


from fastapi import APIRouter, HTTPException
from app.database import driver

router = APIRouter(prefix="/api/graph", tags=["Graph"])


@router.get("/supplier/{supplier_id}")
def get_supplier_graph(supplier_id: str):

    try:
        with driver.session() as session:

            # =====================================================
            # 1. CHECK SUPPLIER
            # =====================================================

            supplier_query = """
            MATCH (s:Supplier {id: $supplier_id})
            RETURN
                s.id AS id,
                s.name AS label,
                s.risk_level AS risk_level,
                s.status AS status
            """

            supplier_result = session.run(
                supplier_query,
                supplier_id=supplier_id
            )

            supplier_record = supplier_result.single()

            if supplier_record is None:
                raise HTTPException(
                    status_code=404,
                    detail="Supplier not found"
                )

            supplier = supplier_record.data()

            # =====================================================
            # 2. FIND ALL AFFECTED COMPONENTS
            #
            # Supplier
            #    ↓ SUPPLIES
            # Root Component
            #    ↓ DEPENDS_ON
            # Other Components
            # =====================================================

            component_query = """
            MATCH (s:Supplier {id: $supplier_id})
            MATCH (s)-[:SUPPLIES]->(root:Component)

            OPTIONAL MATCH (root)<-[:DEPENDS_ON*0..5]-(component:Component)

            WITH collect(DISTINCT root) +
                 collect(DISTINCT component) AS all_components

            UNWIND all_components AS c

            WITH DISTINCT c
            WHERE c IS NOT NULL

            RETURN
                c.id AS id,
                c.name AS label,
                c.category AS category,
                c.criticality AS criticality
            ORDER BY c.name
            """

            component_result = session.run(
                component_query,
                supplier_id=supplier_id
            )

            components = [
                record.data()
                for record in component_result
            ]

            # =====================================================
            # 3. FIND PRODUCTS USED BY AFFECTED COMPONENTS
            # =====================================================

            component_ids = [
                component["id"]
                for component in components
            ]

            products = []

            if component_ids:

                product_query = """
                MATCH (c:Component)-[:USED_IN]->(p:Product)

                WHERE c.id IN $component_ids

                RETURN DISTINCT
                    p.id AS id,
                    p.name AS label,
                    p.category AS category,
                    p.risk_level AS risk_level
                ORDER BY p.name
                """

                product_result = session.run(
                    product_query,
                    component_ids=component_ids
                )

                products = [
                    record.data()
                    for record in product_result
                ]

            # =====================================================
            # 4. BUILD NODES
            # =====================================================

            nodes = []

            # Supplier node

            nodes.append({
                "id": supplier["id"],
                "type": "supplier",
                "label": supplier["label"],
                "risk_level": supplier["risk_level"],
                "status": supplier["status"]
            })

            # Component nodes

            for component in components:

                nodes.append({
                    "id": component["id"],
                    "type": "component",
                    "label": component["label"],
                    "category": component["category"],
                    "criticality": component["criticality"]
                })

            # Product nodes

            for product in products:

                nodes.append({
                    "id": product["id"],
                    "type": "product",
                    "label": product["label"],
                    "category": product["category"],
                    "risk_level": product["risk_level"]
                })

            # =====================================================
            # 5. SUPPLIER → COMPONENT EDGES
            # =====================================================

            supply_edge_query = """
            MATCH (s:Supplier {id: $supplier_id})
                  -[r:SUPPLIES]->
                  (c:Component)

            WHERE c.id IN $component_ids

            RETURN
                s.id AS source,
                c.id AS target,
                type(r) AS type
            """

            supply_result = session.run(
                supply_edge_query,
                supplier_id=supplier_id,
                component_ids=component_ids
            )

            supply_edges = [
                record.data()
                for record in supply_result
            ]

            # =====================================================
            # 6. COMPONENT → COMPONENT DEPENDENCY EDGES
            # =====================================================

            dependency_edges = []

            if component_ids:

                dependency_query = """
                MATCH (a:Component)-[r:DEPENDS_ON]->(b:Component)

                WHERE a.id IN $component_ids
                  AND b.id IN $component_ids

                RETURN
                    a.id AS source,
                    b.id AS target,
                    type(r) AS type
                """

                dependency_result = session.run(
                    dependency_query,
                    component_ids=component_ids
                )

                dependency_edges = [
                    record.data()
                    for record in dependency_result
                ]

            # =====================================================
            # 7. COMPONENT → PRODUCT EDGES
            # =====================================================

            product_edges = []

            if component_ids:

                product_edge_query = """
                MATCH (c:Component)-[r:USED_IN]->(p:Product)

                WHERE c.id IN $component_ids

                RETURN DISTINCT
                    c.id AS source,
                    p.id AS target,
                    type(r) AS type
                """

                product_edge_result = session.run(
                    product_edge_query,
                    component_ids=component_ids
                )

                product_edges = [
                    record.data()
                    for record in product_edge_result
                ]

            # =====================================================
            # 8. COMBINE ALL EDGES
            # =====================================================

            all_edges = []

            for edge in supply_edges:
                all_edges.append({
                    "id": f'{edge["source"]}-{edge["type"]}-{edge["target"]}',
                    "source": edge["source"],
                    "target": edge["target"],
                    "type": edge["type"]
                })

            for edge in dependency_edges:
                all_edges.append({
                    "id": f'{edge["source"]}-{edge["type"]}-{edge["target"]}',
                    "source": edge["source"],
                    "target": edge["target"],
                    "type": edge["type"]
                })

            for edge in product_edges:
                all_edges.append({
                    "id": f'{edge["source"]}-{edge["type"]}-{edge["target"]}',
                    "source": edge["source"],
                    "target": edge["target"],
                    "type": edge["type"]
                })

            # =====================================================
            # 9. RETURN GRAPH
            # =====================================================

            return {
                "supplier_id": supplier_id,
                "nodes": nodes,
                "edges": all_edges
            }

    except HTTPException:
        raise

    except Exception as e:

        print("Graph error:", e)

        raise HTTPException(
            status_code=503,
            detail="Unable to load supplier dependency graph"
        )

    query = """
    MATCH (s:Supplier {id: $supplier_id})

    OPTIONAL MATCH (s)-[r1:SUPPLIES]->(c:Component)

    OPTIONAL MATCH (c)-[r2:USED_IN]->(p:Product)

    RETURN
        s,
        collect(DISTINCT c) AS components,
        collect(DISTINCT p) AS products,
        collect(DISTINCT r1) AS supply_relationships,
        collect(DISTINCT r2) AS usage_relationships
    """

    try:

        with driver.session() as session:

            result = session.run(
                query,
                supplier_id=supplier_id
            )

            record = result.single()

            if not record:
                raise HTTPException(
                    status_code=404,
                    detail="Supplier not found"
                )

            supplier = record["s"]

            components = record["components"]
            products = record["products"]

            supply_relationships = record[
                "supply_relationships"
            ]

            usage_relationships = record[
                "usage_relationships"
            ]

        nodes = {}
        edges = {}

        # -------------------------
        # Supplier
        # -------------------------

        supplier_id_value = supplier.get("id")

        nodes[supplier_id_value] = {
            "id": supplier_id_value,
            "type": "supplier",
            "label": supplier.get("name"),
            "risk_level": supplier.get("risk_level"),
            "status": supplier.get("status")
        }

        # -------------------------
        # Components
        # -------------------------

        for component in components:

            if component is None:
                continue

            component_id = component.get("id")

            if not component_id:
                continue

            nodes[component_id] = {
                "id": component_id,
                "type": "component",
                "label": component.get("name"),
                "category": component.get("category"),
                "criticality": component.get("criticality")
            }

        # -------------------------
        # Products
        # -------------------------

        for product in products:

            if product is None:
                continue

            product_id = product.get("id")

            if not product_id:
                continue

            nodes[product_id] = {
                "id": product_id,
                "type": "product",
                "label": product.get("name"),
                "category": product.get("category"),
                "risk_level": product.get("risk_level")
            }

        # -------------------------
        # Supplier -> Component
        # -------------------------

        for relationship in supply_relationships:

            if relationship is None:
                continue

            source_node = relationship.start_node
            target_node = relationship.end_node

            source_id = source_node.get("id")
            target_id = target_node.get("id")

            if not source_id or not target_id:
                continue

            edge_id = (
                f"{source_id}-"
                f"{relationship.type}-"
                f"{target_id}"
            )

            edges[edge_id] = {
                "id": edge_id,
                "source": source_id,
                "target": target_id,
                "type": relationship.type
            }

        # -------------------------
        # Component -> Product
        # -------------------------

        for relationship in usage_relationships:

            if relationship is None:
                continue

            source_node = relationship.start_node
            target_node = relationship.end_node

            source_id = source_node.get("id")
            target_id = target_node.get("id")

            if not source_id or not target_id:
                continue

            edge_id = (
                f"{source_id}-"
                f"{relationship.type}-"
                f"{target_id}"
            )

            edges[edge_id] = {
                "id": edge_id,
                "source": source_id,
                "target": target_id,
                "type": relationship.type
            }

        return {
            "supplier_id": supplier_id,
            "nodes": list(nodes.values()),
            "edges": list(edges.values())
        }

    except HTTPException:
        raise

    except Exception as e:

        print("Graph error:", e)

        raise HTTPException(
            status_code=503,
            detail="Unable to load graph data"
        )