export type ScannerProps = {
  onBarcode: (code: string) => void;      // fires once per open
  onPhoto: (base64Jpeg: string) => void;   // AI label photo
  onCancel: () => void;
  hint?: string;                           // status text shown under the camera
};
