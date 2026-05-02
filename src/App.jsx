import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Welcome from './pages/Welcome'
import Matches from './pages/Matches'
import Leaderboard from './pages/Leaderboard'
import Questions from './pages/Questions'
import Admin from './pages/Admin'
import Participants from './pages/Participants'
import ParticipantProfile from './pages/ParticipantProfile'
import MinVin from './pages/MinVin'
import Vinpotten from './pages/Vinpotten'
import Info from './pages/Info'
import Scorers from './pages/Scorers'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Forum from './pages/Forum'   // ← NY

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4' }}>
      <Navbar />
      <main style={{ paddingTop: 60 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/välkommen" element={<Welcome />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/participants" element={<Participants />} />
          <Route path="/participant/:user_id" element={<ParticipantProfile />} />
          <Route path="/mitt-vin" element={<MinVin />} />
          <Route path="/vinpotten" element={<Vinpotten />} />
          <Route path="/info" element={<Info />} />
          <Route path="/skytteliga" element={<Scorers />} />
          <Route path="/glomt-losenord" element={<ForgotPassword />} />
          <Route path="/nytt-losenord" element={<ResetPassword />} />
          <Route path="/forum" element={<Forum />} />   {/* ← NY */}
        </Routes>
      </main>
    </div>
  )
}