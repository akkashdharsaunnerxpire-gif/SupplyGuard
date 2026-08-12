from fastapi import APIRouter, HTTPException
from app.database import driver

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("")
def get_products():
    query = """
    MATCH (p:Product)
    RETURN
        p.id AS id,
        p.name AS name,
        p.category AS category,
        p.risk_level AS risk_level
    ORDER BY p.name
    """

    try:
        with driver.session() as session:
            result = session.run(query)
            products = [record.data() for record in result]

        return {
            "count": len(products),
            "products": products
        }

    except Exception as e:
        print("Products error:", e)

        raise HTTPException(
            status_code=503,
            detail="Unable to load products"
        )