import {
    Navigate,
    Route,
    Routes,
} from "react-router"

import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { HomePage } from "@/pages/HomePage"
import { PrivacyPage } from "@/pages/PrivacyPage"
import { SimulatorPage } from "@/pages/SimulatorPage"
import { TermsPage } from "@/pages/TermsPage"

// アプリケーション本体
function App() {
    return (
        <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
            <Header />

            <main className="flex-1">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/simulator" element={<SimulatorPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>

            <Footer />
        </div>
    )
}

export default App