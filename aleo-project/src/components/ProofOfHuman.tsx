import React, { useState, useEffect } from 'react';
import { SelfAppBuilder } from '@selfxyz/core';
import QRCode from '@selfxyz/qrcode';
import { v4 as uuidv4 } from 'uuid';

interface ProofOfHumanProps {
  onVerification: (result: { verified: boolean; data?: any }) => void;
}

const ProofOfHuman: React.FC<ProofOfHumanProps> = ({ onVerification }) => {
  const [selfApp, setSelfApp] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [verificationData, setVerificationData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Generate a unique user ID
    const userId = uuidv4();
    
    // Create the SelfApp configuration based on the official template
    const app = new SelfAppBuilder({
      appName: "Prove You're Human",
      scope: "prove-human-demo",           // Unique app identifier
      endpoint: "https://d8d1-213-146-76-174.ngrok-free.app/api/verify", // IMPORTANT: Update this with your ngrok URL
      endpointType: "https",               // Backend API mode
      userId,                              // Unique user ID
      userIdType: "uuid",                  // ID type
      disclosures: {                       // What data to request
        issuing_state: true,
        name: true,
        nationality: true,
        date_of_birth: true,
        gender: true,
        passport_number: true,
        expiry_date: true,
      },
      devMode: true,                       // Development mode (uses mock passports)
    }).build();

    setSelfApp(app);
  }, []);

  const handleSuccess = () => {
    console.log('Verification successful');
    setVerificationStatus('success');
    // Note: The actual data comes from the backend response, not the QRCode component
    onVerification({ verified: true });
  };

  const handleError = (error: any) => {
    console.error('Verification error:', error);
    setVerificationStatus('error');
    setErrorMessage(error.message || 'Verification failed. Please try again.');
    onVerification({ verified: false });
  };

  if (!selfApp) {
    return (
      <div className="proof-of-human-container">
        <div className="loading">
          <h3>🔄 Loading verification...</h3>
          <p>Setting up human verification system...</p>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <div className="proof-of-human-container">
        <div className="success-message">
          <h3>✅ Human Verification Complete!</h3>
          <p>You have successfully proven you are human.</p>
          {verificationData && (
            <div className="verification-details">
              <h4>Verification Details:</h4>
              <ul>
                <li><strong>User ID:</strong> {verificationData.userId}</li>
                <li><strong>Name:</strong> {verificationData.name || 'Not disclosed'}</li>
                <li><strong>Nationality:</strong> {verificationData.nationality || 'Not disclosed'}</li>
                <li><strong>Issuing State:</strong> {verificationData.issuingState || 'Not disclosed'}</li>
                <li><strong>Verified At:</strong> {new Date(verificationData.verifiedAt).toLocaleString()}</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (verificationStatus === 'error') {
    return (
      <div className="proof-of-human-container">
        <div className="error-message">
          <h3>❌ Verification Failed</h3>
          <p>{errorMessage}</p>
          <button 
            onClick={() => {
              setVerificationStatus('idle');
              setErrorMessage('');
            }}
            className="retry-button"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="proof-of-human-container">
      <h3>🤖 Prove You're Human</h3>
      <p>Scan this QR code with the Self mobile app to verify your identity using your passport.</p>
      
      <div className="qr-section">
        <QRCode 
          selfApp={selfApp} 
          onSuccess={handleSuccess} 
          onError={handleError}
          size={300}
        />
      </div>

      <div className="instructions">
        <h4>📱 How to verify:</h4>
        <ol>
          <li>Download the Self mobile app from your app store</li>
          <li>Create a mock passport in the app (for testing)</li>
          <li>Scan the QR code above with the Self app</li>
          <li>Complete the verification process</li>
        </ol>
      </div>

      <div className="info-box">
        <h4>🔒 Privacy & Security</h4>
        <ul>
          <li>Your passport data remains private and secure</li>
          <li>Only the verification result is shared</li>
          <li>No personal information is stored on our servers</li>
          <li>Uses zero-knowledge proofs for maximum privacy</li>
        </ul>
      </div>

      {verificationStatus === 'verifying' && (
        <div className="verifying-message">
          <h4>🔄 Verifying...</h4>
          <p>Please complete the verification in the Self app.</p>
        </div>
      )}
    </div>
  );
};

export default ProofOfHuman; 