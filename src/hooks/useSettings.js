import { useState, useEffect } from 'react'

export function useSettings() {
  const [tipsLåst, setTipsLåst] = useState(false)
  const [laddar, setLaddar] = useState(true)

  useEffect(() => {
    fetch('/.netlify/functions/settings')
      .then((res) => res.json())
      .then((data) => {
        setTipsLåst(data.tips_låst)
        setLaddar(false)
      })
  }, [])

  return { tipsLåst, laddar }
}