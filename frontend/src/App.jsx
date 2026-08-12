import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import Graph from "./components/Graph";

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [summary, setSummary] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [impact, setImpact] = useState(null);

  const [loading, setLoading] = useState(true);
  const [impactLoading, setImpactLoading] = useState(false);
  const [error, setError] = useState("");

  // Load dashboard data when page opens
  useEffect(() => {
    loadDashboard();
  }, []);

  // ------------------------------------------
  // LOAD DASHBOARD
  // ------------------------------------------
  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [summaryRes, suppliersRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/summary`),
        axios.get(`${API_URL}/api/suppliers`),
      ]);

      setSummary(summaryRes.data);

      const supplierList = suppliersRes.data.suppliers || [];

      setSuppliers(supplierList);

      // Select first supplier automatically
      if (supplierList.length > 0) {
        setSelectedSupplier(supplierList[0].id);
      }
    } catch (err) {
      console.error("Dashboard loading error:", err);

      setError("Unable to load SupplyGuard data.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------
  // RISK ANALYSIS
  // ------------------------------------------
  const getRiskAnalysis = () => {
    if (!impact) {
      return null;
    }

    const components = impact.affected_component_count || 0;
    const products = impact.affected_product_count || 0;

    let level = "MEDIUM";
    let message =
      "The supplier failure has a limited downstream impact.";

    // CRITICAL
    if (components >= 3 && products >= 2) {
      level = "CRITICAL";

      message =
        "The supplier failure can significantly disrupt multiple components and downstream products.";
    }

    // HIGH
    else if (components >= 2 || products >= 1) {
      level = "HIGH";

      message =
        "The supplier failure may affect important downstream supply chain operations.";
    }

    // MEDIUM
    else {
      level = "MEDIUM";

      message =
        "The supplier failure has a limited downstream impact.";
    }

    // ------------------------------------------
    // RECOMMENDATIONS
    // ------------------------------------------

    const recommendations = [];

    const affectedComponents = impact.affected_components || [];
    const affectedProducts = impact.affected_products || [];

    // Recommend alternate supplier for each affected component
    affectedComponents.forEach((component) => {
      recommendations.push({
        title: "Find alternate supplier",
        component: component.name,
      });
    });

    // Recommend reviewing downstream products
    if (affectedProducts.length > 0) {
      recommendations.push({
        title: "Review product dependency",
        component: `${affectedProducts.length} downstream product(s)`,
      });
    }

    return {
      level,
      message,
      recommendations,
    };
  };

  // Calculate risk analysis only once per render
  const riskAnalysis = getRiskAnalysis();

  // ------------------------------------------
  // SIMULATE SUPPLIER FAILURE
  // ------------------------------------------
  const simulateFailure = async () => {
    if (!selectedSupplier) {
      return;
    }

    try {
      setImpactLoading(true);
      setError("");
      setImpact(null);

      const response = await axios.get(
        `${API_URL}/api/suppliers/${selectedSupplier}/impact`
      );

      setImpact(response.data);
    } catch (err) {
      console.error("Impact analysis error:", err);

      setError("Unable to perform supplier impact analysis.");
    } finally {
      setImpactLoading(false);
    }
  };

  // ------------------------------------------
  // LOADING SCREEN
  // ------------------------------------------
  if (loading) {
    return (
      <div className="page-center">
        <div className="loader"></div>

        <p>Loading SupplyGuard...</p>
      </div>
    );
  }

  // ------------------------------------------
  // MAIN UI
  // ------------------------------------------
  return (
    <div className="app">
      {/* ========================================
          NAVBAR
      ======================================== */}
      <header className="navbar">
        <div>
          <h1>SupplyGuard</h1>

          <p>Supply Chain Risk & Traceability</p>
        </div>

        <div className="status">
          <span></span>
          Graph Connected
        </div>
      </header>

      <main className="container">

        {/* ========================================
            HERO SECTION
        ======================================== */}
        <section className="hero">
          <div>
            <p className="eyebrow">RISK INTELLIGENCE</p>

            <h2>
              Understand your supply chain before disruption happens.
            </h2>

            <p>
              Simulate supplier failures and discover the components and
              products that could be affected through the dependency graph.
            </p>
          </div>
        </section>

        {/* ========================================
            ERROR MESSAGE
        ======================================== */}
        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        {/* ========================================
            DASHBOARD STATS
        ======================================== */}
        <section className="stats">

          <div className="stat-card">
            <span>Suppliers</span>

            <strong>
              {summary?.suppliers ?? 0}
            </strong>
          </div>

          <div className="stat-card">
            <span>Components</span>

            <strong>
              {summary?.components ?? 0}
            </strong>
          </div>

          <div className="stat-card">
            <span>Products</span>

            <strong>
              {summary?.products ?? 0}
            </strong>
          </div>

          <div className="stat-card danger">
            <span>Critical Dependencies</span>

            <strong>
              {summary?.critical_dependencies ?? 0}
            </strong>
          </div>

        </section>

        {/* ========================================
            SUPPLIER FAILURE SIMULATION
        ======================================== */}
        <section className="analysis-card">

          <div className="section-heading">

            <div>
              <p className="eyebrow">
                IMPACT SIMULATION
              </p>

              <h2>
                Simulate Supplier Failure
              </h2>
            </div>

            <div className="risk-badge">
              Risk Analysis
            </div>

          </div>

          <p className="description">
            Select a supplier to trace its downstream dependencies through
            multiple graph relationships.
          </p>

          <div className="controls">

            <select
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);

                // Clear previous simulation
                setImpact(null);

                setError("");
              }}
            >
              {suppliers.length === 0 ? (
                <option value="">
                  No suppliers available
                </option>
              ) : (
                suppliers.map((supplier) => (
                  <option
                    key={supplier.id}
                    value={supplier.id}
                  >
                    {supplier.name} — {supplier.risk_level} Risk
                  </option>
                ))
              )}
            </select>

            <button
              onClick={simulateFailure}
              disabled={
                impactLoading || !selectedSupplier
              }
            >
              {impactLoading
                ? "Analyzing..."
                : "Simulate Failure"}
            </button>

          </div>

        </section>

        {/* ========================================
            SIMULATION RESULT
        ======================================== */}
        {impact && (
          <section className="impact-section">

            {/* Header */}
            <div className="impact-header">

              <div>
                <p className="eyebrow">
                  SIMULATION RESULT
                </p>

                <h2>
                  {impact.supplier_name}
                </h2>
              </div>

              <div className="failed-badge">
                ● Supplier Failure
              </div>

            </div>

            {/* Impact Stats */}
            <div className="impact-stats">

              <div>
                <span>
                  Affected Components
                </span>

                <strong>
                  {impact.affected_component_count ?? 0}
                </strong>
              </div>

              <div>
                <span>
                  Affected Products
                </span>

                <strong>
                  {impact.affected_product_count ?? 0}
                </strong>
              </div>

            </div>

            {/* Results */}
            <div className="results-grid">

              {/* ==================================
                  AFFECTED COMPONENTS
              ================================== */}
              <div className="result-card">

                <h3>
                  ⚙ Affected Components
                </h3>

                {!impact.affected_components ||
                impact.affected_components.length === 0 ? (
                  <p className="empty">
                    No affected components found.
                  </p>
                ) : (
                  impact.affected_components.map(
                    (component) => (
                      <div
                        className="result-item"
                        key={component.id}
                      >
                        <div>

                          <strong>
                            {component.name}
                          </strong>

                          <small>
                            {component.category}
                          </small>

                        </div>

                        <span className="criticality">
                          {component.criticality}
                        </span>

                      </div>
                    )
                  )
                )}

              </div>

              {/* ==================================
                  AFFECTED PRODUCTS
              ================================== */}
              <div className="result-card">

                <h3>
                  ▣ Affected Products
                </h3>

                {!impact.affected_products ||
                impact.affected_products.length === 0 ? (
                  <p className="empty">
                    No affected products found.
                  </p>
                ) : (
                  impact.affected_products.map(
                    (product) => (
                      <div
                        className="result-item"
                        key={product.id}
                      >
                        <div>

                          <strong>
                            {product.name}
                          </strong>

                          <small>
                            {product.category}
                          </small>

                        </div>

                        <span className="product-risk">
                          {product.risk_level}
                        </span>

                      </div>
                    )
                  )
                )}

              </div>

            </div>

          </section>
        )}

        {/* ========================================
            RISK ANALYSIS
        ======================================== */}
        {impact && riskAnalysis && (
          <section className="risk-analysis-section">

            {/* Risk Header */}
            <div className="section-heading">

              <div>
                <p className="eyebrow">
                  RISK ANALYSIS
                </p>

                <h2>
                  Supply Chain Risk Assessment
                </h2>
              </div>

              <div
                className={`analysis-risk-badge ${riskAnalysis.level.toLowerCase()}`}
              >
                ● {riskAnalysis.level} RISK
              </div>

            </div>

            {/* Risk Explanation */}
            <div className="risk-summary">

              <h3>
                Why is this risk level?
              </h3>

              <p>
                {riskAnalysis.message}
              </p>

            </div>

            {/* Recommendations */}
            <div className="recommendations">

              <h3>
                Recommended Actions
              </h3>

              {riskAnalysis.recommendations.length === 0 ? (

                <p className="empty">
                  No immediate recommendations available.
                </p>

              ) : (

                riskAnalysis.recommendations.map(
                  (item, index) => (

                    <div
                      className="recommendation-item"
                      key={`${item.title}-${item.component}-${index}`}
                    >

                      <div className="recommendation-icon">
                        ⚠
                      </div>

                      <div>

                        <strong>
                          {item.title}
                        </strong>

                        <small>
                          {item.component}
                        </small>

                      </div>

                    </div>

                  )
                )

              )}

            </div>

          </section>
        )}

        {/* ========================================
            DEPENDENCY GRAPH
        ======================================== */}
        <Graph
          supplierId={selectedSupplier}
          impact={impact}
        />

        {/* ========================================
            FOOTER
        ======================================== */}
        <footer>

          <span>
            SupplyGuard
          </span>

          <span>
            Graph-powered supply chain intelligence
          </span>

        </footer>

      </main>
    </div>
  );
}

export default App;