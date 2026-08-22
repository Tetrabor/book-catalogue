import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
}

export default function Scanner({ onScanSuccess }: ScannerProps) {
  // This ref acts as a true/false flag so we don't start the camera twice
  const isScannerInitialized = useRef(false);

  useEffect(() => {
    // If the scanner is already running, stop and do nothing (fixes Strict Mode crash)
    if (isScannerInitialized.current) return;
    isScannerInitialized.current = true;

    const scanner = new Html5QrcodeScanner(
      "reader", 
      { 
        fps: 10, 
        qrbox: { width: 250, height: 100 }, 
        aspectRatio: 1.0 
      }, 
      false
    );

    scanner.render(
      (decodedText) => {
        // Pause the scanner immediately after a successful read so it doesn't rapid-fire
        scanner.pause();
        onScanSuccess(decodedText);
      },
      (error) => {
        // It silently errors every frame it doesn't see a barcode, so we ignore this
      }
    );

    // Cleanup function when the scanner is removed from the screen
    return () => {
      scanner.clear().catch(console.error);
      isScannerInitialized.current = false;
    };
    
  // The empty brackets below are CRITICAL. 
  // They tell React to only run this setup code exactly once when the page loads.
  }, []);

  return <div id="reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}></div>;
}