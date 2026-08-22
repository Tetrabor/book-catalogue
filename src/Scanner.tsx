import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
}

export default function Scanner({ onScanSuccess }: ScannerProps) {
  const isScannerInitialized = useRef(false);

  useEffect(() => {
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
        scanner.pause();
        onScanSuccess(decodedText);
      },
      // We removed the unused 'error' variable from the parentheses here:
      () => {
        // It silently errors every frame it doesn't see a barcode, so we ignore this
      }
    );

    return () => {
      scanner.clear().catch(console.error);
      isScannerInitialized.current = false;
    };
    
  }, []);

  return <div id="reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}></div>;
}