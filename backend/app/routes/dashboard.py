from fastapi import APIRouter, HTTPException
from app.database import driver

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_dashboard_summary():

    count_query = """
    MATCH (s:Supplier)
    WITH count(s) AS suppliers

    MATCH (c:Component)
    WITH suppliers, count(c) AS components

    MATCH (p:Product)
    WITH suppliers, components, count(p) AS products

    MATCH (f:Facility)
    RETURN suppliers,
           components,
           products,
           count(f) AS facilities
    """

    critical_query = """
MATCH (c:Component)<-[:SUPPLIES]-(s:Supplier)
WITH c, collect(s) AS suppliers
WHERE size(suppliers) = 1

MATCH (c)-[:USED_IN]->(p:Product)

RETURN count(DISTINCT c) AS critical_dependencies
"""

    try:
        with driver.session() as session:

            count_result = session.run(count_query)
            count_record = count_result.single()

            critical_result = session.run(critical_query)
            critical_record = critical_result.single()

        return {
            "suppliers": count_record["suppliers"],
            "components": count_record["components"],
            "products": count_record["products"],
            "facilities": count_record["facilities"],
            "critical_dependencies": critical_record["critical_dependencies"]
        }

    except Exception as e:
        print("Dashboard error:", e)

        raise HTTPException(
            status_code=503,
            detail="Unable to load dashboard data"
        )