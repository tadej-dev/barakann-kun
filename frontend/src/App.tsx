import {
    Navigate,
    Route,
    Routes,
} from "react-router"

import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { PrivacyPage } from "@/pages/PrivacyPage"
import { SimulatorPage } from "@/pages/SimulatorPage"
import { SharedBuildPage } from "@/pages/SharedBuildPage"
import { TermsPage } from "@/pages/TermsPage"

// アプリケーション本体
function App() {
    // ヘッダーとフッターはルートを切り替えても維持し、中央だけをページとして差し替える。
    return (
        <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
            <Header />

            <div className="flex-1">
                <Routes>
                    {/* シミュレーターをトップ画面として扱い、旧URLは互換のためリダイレクトする。 */}
                    <Route path="/" element={<SimulatorPage />} />
                    <Route
                        path="/simulator"
                        element={<Navigate to="/" replace />}
                    />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route
                        path="/shared/:shareToken"
                        element={<SharedBuildPage />}
                    />
                    {/* 未知のURLは利用者が迷わないようシミュレーターへ戻す。 */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>

            <Footer />
        </div>
    )
}

export default App
