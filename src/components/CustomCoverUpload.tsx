import { useState } from 'react';

interface Props {
  uploadCustomCover: (file: File) => Promise<string | null>;
  onCoverUploaded: (url: string) => void;
}

export default function CustomCoverUpload({ uploadCustomCover, onCoverUploaded }: Props) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const file = e.target.files[0];
      const url = await uploadCustomCover(file);
      
      if (url) {
        onCoverUploaded(url);
      } else {
        alert("Upload failed. Make sure you are signed in to Google.");
      }
      setIsUploading(false);
    }
  };

  return (
    <div style={{ marginTop: '15px', padding: '15px', border: '1px dashed #ccc', borderRadius: '8px', textAlign: 'center', backgroundColor: '#fdfdfd' }}>
      <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '14px' }}>
        Don't see your cover? Take a photo!
      </p>
      {isUploading ? (
        <p style={{ color: '#007bff', fontWeight: 'bold', margin: 0 }}>Uploading to Google Drive...</p>
      ) : (
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          onChange={handleFileChange}
          style={{ width: '100%', fontSize: '14px' }}
        />
      )}
    </div>
  );
}