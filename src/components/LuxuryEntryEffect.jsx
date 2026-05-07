/**
 * ============================================
 * LUXURY VIP ENTRY EFFECT COMPONENT
 * StreamFlow — Vijay Palace Edition
 * ============================================
 */

import React, { useEffect, useState } from 'react';
import '../styles/luxury-theme.css';

export default function LuxuryEntryEffect({ socket }) {
  const [entryUser, setEntryUser] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Jab koi VIP user (Level >= 50 ya Heroic) room mein enter karega
    socket.on('vipUserJoined', (data) => {
      const { username, level, customVehicle } = data;

      if (level >= 50) {
        setEntryUser({
          username,
          level,
          vehicle: customVehicle || '🏎️ GOLDEN SUPERCAR',
        });
        setVisible(true);

        // 5 seconds baad automatic slide out/hide ho jayega
        setTimeout(() => {
          setVisible(false);
          setEntryUser(null);
        }, 5000);
      }
    });

    return () => {
      socket.off('vipUserJoined');
    };
  }, [socket]);

  if (!visible || !entryUser) return null;

  return (
    <div className="vip-entry-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span style={{ fontSize: '30px', animation: 'bounce 1s infinite' }}>
          {entryUser.vehicle === '🏎️ GOLDEN SUPERCAR' ? '🏎️' : '🚁'}
        </span>
        <div>
          <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '18px', textShadow: '0 0 8px rgba(255,215,0,0.8)' }}>
            [VIP LEVEL {entryUser.level}] {entryUser.username}
          </span>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#fff', letterSpacing: '1px' }}>
            has entered the palace in a <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{entryUser.vehicle}</span>!
          </p>
        </div>
      </div>
    </div>
  );
}

