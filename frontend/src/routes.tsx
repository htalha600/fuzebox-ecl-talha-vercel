import { Switch, Route } from "wouter";

import Dashboard from "@/pages/home/Dashboard";
import LiveMonitor from "@/pages/home/LiveMonitor";

import AgentRoster from "@/pages/agents/AgentRoster";

import FinancialImpact from "@/pages/insights/FinancialImpact";
import FiveEquations from "@/pages/insights/FiveEquations";

import CognitionPlane from "@/pages/ecl/CognitionPlane";
import ObservationPlane from "@/pages/ecl/ObservationPlane";
import PredictiveLedger from "@/pages/ecl/PredictiveLedger";
import CoverageManifest from "@/pages/ecl/CoverageManifest";
import Recommendations from "@/pages/ecl/Recommendations";

import Audit from "@/pages/governance/Audit";
import BoardReport from "@/pages/planning/BoardReport";

import ComingSoon from "@/pages/shared/ComingSoon";
import NotFound from "@/pages/shared/NotFound";

export function AppRouter() {
  return (
    <Switch>
      {/* HOME */}
      <Route path="/" component={Dashboard} />
      <Route path="/live" component={LiveMonitor} />

      {/* MY AI AGENTS */}
      <Route path="/agents" component={AgentRoster} />

      {/* INSIGHTS */}
      <Route path="/financial" component={FinancialImpact} />
      <Route path="/equations" component={FiveEquations} />
      <Route path="/benchmarks">
        {() => (
          <ComingSoon
            title="Benchmarks"
            kicker="Insights / Benchmarks"
            blurb="Cross-process benchmarks comparing every workflow's CUoW, MER, and CTR against industry baselines and your own historical sigma."
          />
        )}
      </Route>
      <Route path="/correlations">
        {() => (
          <ComingSoon
            title="Correlations"
            kicker="Insights / Correlations"
            blurb="The Cognition Plane mines correlations between cost, quality, latency, and policy outcomes — surfaces causal signals to engineering and finance."
          />
        )}
      </Route>
      <Route path="/scenarios">
        {() => (
          <ComingSoon
            title="What-If Scenarios"
            kicker="Insights / Scenarios"
            blurb="Replay historical canonical events through alternative model / vendor / trust-tier configurations and forecast economic delta."
          />
        )}
      </Route>
      <Route path="/models">
        {() => (
          <ComingSoon
            title="Model Comparison"
            kicker="Insights / Models"
            blurb="Cost-vs-sigma trade-offs across registered models, recomputed every rollup window. Drives the vendor_swap recommendation template."
          />
        )}
      </Route>
      <Route path="/maturity">
        {() => (
          <ComingSoon
            title="AI Maturity"
            kicker="Insights / AI Maturity"
            blurb="Where your tenant sits on the L1–L5 maturity ladder, scored across five AEOS dimensions: coverage, quality, ROI, governance, workforce readiness."
          />
        )}
      </Route>
      <Route path="/buildbuy">
        {() => (
          <ComingSoon
            title="Build vs Buy"
            kicker="Insights / Build vs Buy"
            blurb="For each workflow, compare the cost / risk / time-to-value of building a custom agent vs adopting a vendor agent — driven by live PEL data."
          />
        )}
      </Route>

      {/* ECONOMIC COGNITION */}
      <Route path="/cognition" component={CognitionPlane} />
      <Route path="/observation" component={ObservationPlane} />
      <Route path="/ledger" component={PredictiveLedger} />
      <Route path="/coverage" component={CoverageManifest} />
      <Route path="/recommendations" component={Recommendations} />

      {/* GOVERNANCE */}
      <Route path="/audit" component={Audit} />
      <Route path="/risk">
        {() => (
          <ComingSoon
            title="Risk Analysis"
            kicker="Governance / Risk"
            blurb="FMEA risk board scored from PEL variance + attribution — RPN computed per workflow."
          />
        )}
      </Route>
      <Route path="/unreviewed">
        {() => (
          <ComingSoon
            title="Unreviewed Decisions"
            kicker="Governance / Unreviewed"
            blurb="Decisions that bypassed human gates due to trust tier — flagged for after-the-fact audit per ISO/IEC 42001."
          />
        )}
      </Route>
      <Route path="/compliance">
        {() => (
          <ComingSoon
            title="Rules & Compliance"
            kicker="Governance / Compliance"
            blurb="Policy library backing the Governance Plane. Each rule is signed and chained alongside its decisions."
          />
        )}
      </Route>

      {/* PLANNING */}
      <Route path="/board" component={BoardReport} />

      <Route component={NotFound} />
    </Switch>
  );
}
