const { RtcTokenBuilder, RtcRole } = require('agora-token');

// .env se credentials fetch karo
const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
const TOKEN_EXPIRY_SECONDS = parseInt(process.env.AGORA_TOKEN_EXPIRY) || 3600; // Default 1 hour

/**
 * Agora RTC Token generate karne ka function
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.generateToken = async (req, res) => {
  try {
    const { channelName, uid, role } = req.body;

    // Validation
    if (!channelName || typeof channelName !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'channelName (Room ID) is required and must be a string',
      });
    }

    if (uid === undefined || uid === null) {
      return res.status(400).json({
        success: false,
        message: 'uid (User ID) is required',
      });
    }

    // Role decide karo: Host = PUBLISHER, Viewer = SUBSCRIBER
    let agoraRole;
    const userRole = role?.toLowerCase();

    if (userRole === 'host') {
      agoraRole = RtcRole.PUBLISHER;
    } else if (userRole === 'viewer' || userRole === 'audience') {
      agoraRole = RtcRole.SUBSCRIBER;
    } else {
      return res.status(400).json({
        success: false,
        message: "Role must be either 'host' or 'viewer'",
      });
    }

    // Expiration time calculate karo (Unix timestamp in seconds)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + TOKEN_EXPIRY_SECONDS;

    // Token generate karo using Agora's RtcTokenBuilder
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      parseInt(uid),
      agoraRole,
      privilegeExpiredTs,
      privilegeExpiredTs
    );

    return res.status(200).json({
      success: true,
      message: 'Token generated successfully',
      data: {
        token,
        channelName,
        uid,
        role: userRole,
        expiresAt: new Date(privilegeExpiredTs * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('Agora Token Generation Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate Agora token',
      error: error.message,
    });
  }
};

/**
 * Health check / Ping endpoint
 */
exports.ping = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Agora Token Server is running',
  });
};
