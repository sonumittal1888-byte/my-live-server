/**
 * ============================================
 * AGORA STREAMING SERVICE — Client Engine
 * StreamFlow — Vijay Palace Edition
 * ============================================
 */

import AgoraRTC from 'agora-rtc-sdk-ng';

let rtc = {
  localAudioTrack: null,
  localVideoTrack: null,
  client: null,
};

// Initialize Agora Client
export const initAgoraClient = () => {
  rtc.client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
  return rtc.client;
};

// Join Streaming Room (Host/Audience)
export const joinStreamRoom = async (appId, channel, token, uid, role) => {
  if (!rtc.client) initAgoraClient();
  
  // Set role: 'host' or 'audience'
  await rtc.client.setClientRole(role);
  await rtc.client.join(appId, channel, token, uid);

  if (role === 'host') {
    // Create and publish local camera/mic tracks
    rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    rtc.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
    
    await rtc.client.publish([rtc.localAudioTrack, rtc.localVideoTrack]);
    return { localVideoTrack: rtc.localVideoTrack, localAudioTrack: rtc.localAudioTrack };
  }
  return null;
};

// Leave Streaming Room
export const leaveStreamRoom = async () => {
  if (rtc.localAudioTrack) {
    rtc.localAudioTrack.close();
    rtc.localAudioTrack = null;
  }
  if (rtc.localVideoTrack) {
    rtc.localVideoTrack.close();
    rtc.localVideoTrack = null;
  }
  if (rtc.client) {
    await rtc.client.leave();
  }
};

