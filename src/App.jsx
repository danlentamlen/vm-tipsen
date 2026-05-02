import { Routes, Route, useLocation } from 'react-router-dom'
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
import Forum from './pages/Forum'

const INGEN_FOOTER = ['/login', '/register', '/välkommen', '/glomt-losenord', '/nytt-losenord']

function Footer() {
  const location = useLocation()
  if (INGEN_FOOTER.includes(location.pathname)) return null

  return (
    <footer style={{
      background: 'linear-gradient(135deg, #0a1628 0%, #1a2e4a 100%)',
      borderTop: '1px solid rgba(197,160,40,0.2)',
      padding: '1.25rem 1.5rem',
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.6rem',
        flexWrap: 'wrap',
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)',
        }}>
          ⚽ VM-tipsen 2026
        </span>
        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>·</span>
        <span style={{
          fontFamily: "'Barlow', sans-serif",
          fontSize: 12,
          color: 'rgba(255,255,255,0.3)',
        }}>
          Skapad av{' '}
          <span style={{ color: '#C5A028', fontWeight: 600 }}>
            Daniel Lennartsson
          </span>
        </span>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ paddingTop: 60, flex: 1 }}>
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
          <Route path="/forum" element={<Forum />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}