import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()

URI = os.getenv("COGNODB_URI")
USERNAME = os.getenv("COGNODB_USERNAME")
PASSWORD = os.getenv("COGNODB_PASSWORD")

driver = GraphDatabase.driver(
    URI,
    auth=(USERNAME, PASSWORD)
)

def run_query(tx, query):
    tx.run(query).consume()


def seed_database(tx):
    # Clear existing graph
    run_query(tx, "MATCH (n) DETACH DELETE n")

    # -------------------------
    # Regions
    # -------------------------
    run_query(tx, """
        CREATE (:Region {
            id: 'IN',
            name: 'India',
            risk_level: 'Low'
        })
    """)

    run_query(tx, """
        CREATE (:Region {
            id: 'TW',
            name: 'Taiwan',
            risk_level: 'Medium'
        })
    """)

    run_query(tx, """
        CREATE (:Region {
            id: 'CN',
            name: 'China',
            risk_level: 'High'
        })
    """)

    # -------------------------
    # Certifications
    # -------------------------
    run_query(tx, """
        CREATE (:Certification {
            id: 'ISO9001',
            name: 'ISO 9001',
            issuer: 'ISO'
        })
    """)

    run_query(tx, """
        CREATE (:Certification {
            id: 'ISO14001',
            name: 'ISO 14001',
            issuer: 'ISO'
        })
    """)

    # -------------------------
    # Suppliers
    # -------------------------
    run_query(tx, """
        CREATE (:Supplier {
            id: 'SUP001',
            name: 'GlobalChip Technologies',
            status: 'Active',
            risk_level: 'High'
        })
    """)

    run_query(tx, """
        CREATE (:Supplier {
            id: 'SUP002',
            name: 'Precision Sensors Ltd',
            status: 'Active',
            risk_level: 'Medium'
        })
    """)

    run_query(tx, """
        CREATE (:Supplier {
            id: 'SUP003',
            name: 'India Components Pvt Ltd',
            status: 'Active',
            risk_level: 'Low'
        })
    """)

    run_query(tx, """
        CREATE (:Supplier {
            id: 'SUP004',
            name: 'PowerCell Industries',
            status: 'Active',
            risk_level: 'Medium'
        })
    """)

    # -------------------------
    # Components
    # -------------------------
    run_query(tx, """
        CREATE (:Component {
            id: 'COMP001',
            name: 'Microcontroller Unit',
            category: 'Electronics',
            criticality: 'Critical'
        })
    """)

    run_query(tx, """
        CREATE (:Component {
            id: 'COMP002',
            name: 'Temperature Sensor',
            category: 'Sensor',
            criticality: 'High'
        })
    """)

    run_query(tx, """
        CREATE (:Component {
            id: 'COMP003',
            name: 'Control Board',
            category: 'Electronics',
            criticality: 'Critical'
        })
    """)

    run_query(tx, """
        CREATE (:Component {
            id: 'COMP004',
            name: 'Battery Pack',
            category: 'Power',
            criticality: 'High'
        })
    """)

    run_query(tx, """
        CREATE (:Component {
            id: 'COMP005',
            name: 'Display Module',
            category: 'Display',
            criticality: 'Medium'
        })
    """)

    run_query(tx, """
        CREATE (:Component {
            id: 'COMP006',
            name: 'Power Management IC',
            category: 'Electronics',
            criticality: 'Critical'
        })
    """)

    # -------------------------
    # Products
    # -------------------------
    run_query(tx, """
        CREATE (:Product {
            id: 'PROD001',
            name: 'Smart Health Monitor',
            category: 'Healthcare',
            risk_level: 'High'
        })
    """)

    run_query(tx, """
        CREATE (:Product {
            id: 'PROD002',
            name: 'Industrial Temperature Controller',
            category: 'Industrial',
            risk_level: 'Medium'
        })
    """)

    run_query(tx, """
        CREATE (:Product {
            id: 'PROD003',
            name: 'Smart Fitness Watch',
            category: 'Consumer Electronics',
            risk_level: 'High'
        })
    """)

    # -------------------------
    # Facilities
    # -------------------------
    run_query(tx, """
        CREATE (:Facility {
            id: 'FAC001',
            name: 'Chennai Assembly Plant',
            type: 'Assembly'
        })
    """)

    run_query(tx, """
        CREATE (:Facility {
            id: 'FAC002',
            name: 'Bangalore Electronics Plant',
            type: 'Manufacturing'
        })
    """)

    # -------------------------
    # Supplier -> Component
    # -------------------------
    run_query(tx, """
        MATCH (s:Supplier {id: 'SUP001'}),
              (c:Component {id: 'COMP001'})
        CREATE (s)-[:SUPPLIES {
            lead_time_days: 14,
            cost: 25.50
        }]->(c)
    """)

    run_query(tx, """
        MATCH (s:Supplier {id: 'SUP002'}),
              (c:Component {id: 'COMP002'})
        CREATE (s)-[:SUPPLIES {
            lead_time_days: 10,
            cost: 12.75
        }]->(c)
    """)

    run_query(tx, """
        MATCH (s:Supplier {id: 'SUP003'}),
              (c:Component {id: 'COMP003'})
        CREATE (s)-[:SUPPLIES {
            lead_time_days: 7,
            cost: 45.00
        }]->(c)
    """)

    run_query(tx, """
        MATCH (s:Supplier {id: 'SUP004'}),
              (c:Component {id: 'COMP004'})
        CREATE (s)-[:SUPPLIES {
            lead_time_days: 12,
            cost: 32.00
        }]->(c)
    """)

    run_query(tx, """
        MATCH (s:Supplier {id: 'SUP001'}),
              (c:Component {id: 'COMP006'})
        CREATE (s)-[:SUPPLIES {
            lead_time_days: 14,
            cost: 18.50
        }]->(c)
    """)

    # -------------------------
    # Component dependencies
    # -------------------------
    run_query(tx, """
        MATCH (a:Component {id: 'COMP003'}),
              (b:Component {id: 'COMP001'})
        CREATE (a)-[:DEPENDS_ON]->(b)
    """)

    run_query(tx, """
        MATCH (a:Component {id: 'COMP003'}),
              (b:Component {id: 'COMP002'})
        CREATE (a)-[:DEPENDS_ON]->(b)
    """)

    run_query(tx, """
        MATCH (a:Component {id: 'COMP006'}),
              (b:Component {id: 'COMP004'})
        CREATE (a)-[:DEPENDS_ON]->(b)
    """)

    # -------------------------
    # Component -> Product
    # -------------------------
    run_query(tx, """
        MATCH (c:Component {id: 'COMP003'}),
              (p:Product {id: 'PROD001'})
        CREATE (c)-[:USED_IN {quantity: 1}]->(p)
    """)

    run_query(tx, """
        MATCH (c:Component {id: 'COMP002'}),
              (p:Product {id: 'PROD002'})
        CREATE (c)-[:USED_IN {quantity: 2}]->(p)
    """)

    run_query(tx, """
        MATCH (c:Component {id: 'COMP003'}),
              (p:Product {id: 'PROD003'})
        CREATE (c)-[:USED_IN {quantity: 1}]->(p)
    """)

    run_query(tx, """
        MATCH (c:Component {id: 'COMP005'}),
              (p:Product {id: 'PROD003'})
        CREATE (c)-[:USED_IN {quantity: 1}]->(p)
    """)

    # -------------------------
    # Product -> Facility
    # -------------------------
    run_query(tx, """
        MATCH (p:Product {id: 'PROD001'}),
              (f:Facility {id: 'FAC001'})
        CREATE (p)-[:MANUFACTURED_AT]->(f)
    """)

    run_query(tx, """
        MATCH (p:Product {id: 'PROD002'}),
              (f:Facility {id: 'FAC002'})
        CREATE (p)-[:MANUFACTURED_AT]->(f)
    """)

    run_query(tx, """
        MATCH (p:Product {id: 'PROD003'}),
              (f:Facility {id: 'FAC001'})
        CREATE (p)-[:MANUFACTURED_AT]->(f)
    """)

    # -------------------------
    # Facility -> Region
    # -------------------------
    run_query(tx, """
        MATCH (f:Facility {id: 'FAC001'}),
              (r:Region {id: 'IN'})
        CREATE (f)-[:LOCATED_IN]->(r)
    """)

    run_query(tx, """
        MATCH (f:Facility {id: 'FAC002'}),
              (r:Region {id: 'IN'})
        CREATE (f)-[:LOCATED_IN]->(r)
    """)

    # -------------------------
    # Supplier -> Region
    # -------------------------
    run_query(tx, """
        MATCH (s:Supplier {id: 'SUP001'}),
              (r:Region {id: 'TW'})
        CREATE (s)-[:LOCATED_IN]->(r)
    """)

    run_query(tx, """
        MATCH (s:Supplier {id: 'SUP002'}),
              (r:Region {id: 'CN'})
        CREATE (s)-[:LOCATED_IN]->(r)
    """)

    run_query(tx, """
        MATCH (s:Supplier {id: 'SUP003'}),
              (r:Region {id: 'IN'})
        CREATE (s)-[:LOCATED_IN]->(r)
    """)

    run_query(tx, """
        MATCH (s:Supplier {id: 'SUP004'}),
              (r:Region {id: 'IN'})
        CREATE (s)-[:LOCATED_IN]->(r)
    """)

    # -------------------------
    # Supplier -> Certification
    # -------------------------
    run_query(tx, """
        MATCH (s:Supplier {id: 'SUP001'}),
              (c:Certification {id: 'ISO9001'})
        CREATE (s)-[:CERTIFIED_BY]->(c)
    """)

    run_query(tx, """
        MATCH (s:Supplier {id: 'SUP002'}),
              (c:Certification {id: 'ISO9001'})
        CREATE (s)-[:CERTIFIED_BY]->(c)
    """)

    run_query(tx, """
        MATCH (s:Supplier {id: 'SUP003'}),
              (c:Certification {id: 'ISO14001'})
        CREATE (s)-[:CERTIFIED_BY]->(c)
    """)

    run_query(tx, """
        MATCH (s:Supplier {id: 'SUP004'}),
              (c:Certification {id: 'ISO9001'})
        CREATE (s)-[:CERTIFIED_BY]->(c)
    """)


def main():
    try:
        with driver.session() as session:
            session.execute_write(seed_database)

        print("✅ SupplyGuard graph seeded successfully!")

    except Exception as e:
        print("❌ Seed failed:", e)

    finally:
        driver.close()


if __name__ == "__main__":
    main()