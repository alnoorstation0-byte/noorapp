"use client";
import React from 'react';
import { ProfessionalBarcodeModal } from './BarcodeScannerWidget';

export default function CameraScannerModal({ 
  isOpen, 
  onClose, 
  onScan 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onScan: (code: string) => void; 
}) {
  if (!isOpen) return null;

  return (
    <ProfessionalBarcodeModal 
      onDetected={(code) => {
        onScan(code);
        onClose();
      }}
      onClose={onClose}
    />
  );
}
