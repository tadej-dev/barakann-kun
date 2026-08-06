import {
    Navigate,
    Route,
    Routes,
} from "react-router"

import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { PrivacyPage } from "@/pages/PrivacyPage"
import { SimulatorPage } from "@/pages/SimulatorPage"
import { TermsPage } from "@/pages/TermsPage"

// アプリケーション本体
function App() {
    return (
        <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
            <Header />

            <div className="flex-1">
                <Routes>
                    <Route path="/" element={<SimulatorPage />} />
                    <Route
                        path="/simulator"
                        element={<Navigate to="/" replace />}
                    />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>

            <Footer />
        </div>
    )
}

export default App
