from fastapi import APIRouter, HTTPException
from app.database import driver

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])


@router.get("")
def get_suppliers():
    query = """
    MATCH (s:Supplier)
    RETURN s.id AS id,
           s.name AS name,
           s.status AS status,
           s.risk_level AS risk_level
    ORDER BY s.name
    """

    try:
        with driver.session() as session:
            result = session.run(query)
            suppliers = [record.data() for record in result]

        return {
            "count": len(suppliers),
            "suppliers": suppliers
        }

    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail="Unable to connect to the graph database"
        )

@router.get("/{supplier_id}/impact")
def get_supplier_impact(supplier_id: str):

    query = """
    MATCH (s:Supplier {id: $supplier_id})

    OPTIONAL MATCH (s)-[:SUPPLIES]->(root:Component)

    OPTIONAL MATCH (root)<-[:DEPENDS_ON*0..5]-(component:Component)

    OPTIONAL MATCH (component)-[:USED_IN]->(product:Product)

    RETURN
        s.id AS supplier_id,
        s.name AS supplier_name,

        collect(DISTINCT {
            id: component.id,
            name: component.name,
            category: component.category,
            criticality: component.criticality
        }) AS affected_components,

        collect(DISTINCT {
            id: product.id,
            name: product.name,
            category: product.category,
            risk_level: product.risk_level
        }) AS affected_products
    """

    try:
        with driver.session() as session:

            result = session.run(
                query,
                supplier_id=supplier_id
            )

            record = result.single()

        if record is None:
            raise HTTPException(
                status_code=404,
                detail="Supplier not found"
            )

        data = record.data()

        # Remove empty/null component objects
        affected_components = [
            item
            for item in data["affected_components"]
            if item.get("id") is not None
        ]

        # Remove empty/null product objects
        affected_products = [
            item
            for item in data["affected_products"]
            if item.get("id") is not None
        ]

        return {
            "supplier_id": data["supplier_id"],
            "supplier_name": data["supplier_name"],
            "affected_components": affected_components,
            "affected_products": affected_products,
            "affected_component_count": len(affected_components),
            "affected_product_count": len(affected_products)
        }

    except HTTPException:
        raise

    except Exception as e:
        print("Impact analysis error:", repr(e))

        raise HTTPException(
            status_code=503,
            detail="Unable to perform supplier impact analysis"
        )


@router.get("/risk/critical-dependencies")
def get_critical_dependencies():
    query = """
    MATCH (c:Component)<-[:SUPPLIES]-(s:Supplier)
    WITH c, collect(s) AS suppliers
    WHERE size(suppliers) = 1

    MATCH (c)-[:USED_IN]->(p:Product)

    RETURN
        c.id AS component_id,
        c.name AS component_name,
        c.criticality AS criticality,
        suppliers[0].id AS supplier_id,
        suppliers[0].name AS supplier_name,
        collect(DISTINCT p.name) AS affected_products
    ORDER BY c.criticality DESC, c.name
    """

    try:
        with driver.session() as session:
            result = session.run(query)
            risks = [record.data() for record in result]

        return {
            "count": len(risks),
            "critical_dependencies": risks
        }

    except Exception as e:
        print("Critical dependency error:", e)

        raise HTTPException(
            status_code=503,
            detail="Unable to analyze critical dependencies"
        )