import { Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from './pages/Landing/LandingPage'
import { ThemeProvider } from './hooks/useTheme'
import { BuyerOverviewPage } from './pages/Buyer/BuyerOverviewPage'
import { ExploreSkillsPage } from './pages/Skills/ExploreSkillsPage'
import { SkillDetailPage } from './pages/Skills/SkillDetailPage'
import { RouteScrollReset } from './components/shared/RouteScrollReset'
import { TestWorkflowProvider } from './hooks/useTestWorkflow'
import { TestSetupPage } from './pages/Evaluation/TestSetupPage'
import { AgreementPage } from './pages/Evaluation/AgreementPage'
import { EvaluationProgressPage } from './pages/Evaluation/EvaluationProgressPage'
import { EvaluationResultsPage } from './pages/Evaluation/EvaluationResultsPage'
import { DeliveredSkillPage } from './pages/Skills/DeliveredSkillPage'
import { SellerWorkspaceProvider } from './hooks/useSellerWorkspace'
import { RegisterSkillPage } from './pages/Seller/RegisterSkillPage'
import { SellerOverviewPage } from './pages/Seller/SellerOverviewPage'

export default function App() {
  return <ThemeProvider><TestWorkflowProvider><SellerWorkspaceProvider><RouteScrollReset /><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/buyer" element={<BuyerOverviewPage />} />
    <Route path="/buyer/skills" element={<ExploreSkillsPage />} />
    <Route path="/buyer/skills/:skillId" element={<SkillDetailPage />} />
    <Route path="/buyer/evaluations/new" element={<TestSetupPage />} />
    <Route path="/buyer/evaluations/review" element={<AgreementPage />} />
    <Route path="/buyer/evaluations/progress" element={<EvaluationProgressPage />} />
    <Route path="/buyer/evaluations/results" element={<EvaluationResultsPage />} />
    <Route path="/buyer/my-skills/invoice-field-extractor" element={<DeliveredSkillPage />} />
    <Route path="/seller/register" element={<RegisterSkillPage />} />
    <Route path="/seller" element={<SellerOverviewPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></SellerWorkspaceProvider></TestWorkflowProvider></ThemeProvider>
}
