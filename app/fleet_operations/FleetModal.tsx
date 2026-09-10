'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';
import SmartCombo from '@/components/SmartCombo'; 
import AquaModalWrapper from '@/components/AquaModalWrapper';

// Arabic labels via charCode to avoid file-encoding corruption
const LBL = {
    vehicle: String.fromCharCode(0x0627,0x0644,0x0633,0x064a,0x0627,0x0631,0x0629),
    driver: String.fromCharCode(0x0627,0x0644,0x0645,0x0646,0x062f,0x0648,0x0628),
    date: String.fromCharCode(0x0627,0x0644,0x062a,0x0627,0x0631,0x064a,0x062e),
    status: String.fromCharCode(0x0627,0x0644,0x062d,0x0627,0x0644,0x0629),
    notes: String.fromCharCode(0x0645,0x0644,0x0627,0x062d,0x0638,0x0627,0x062a),
    open: String.fromCharCode(0x0645,0x0641,0x062a,0x0648,0x062d),
    closed: String.fromCharCode(0x0645,0x063a,0x0644,0x0642),
    employee: String.fromCharCode(0x0645,0x0648,0x0638,0x0641),
    titleEdit: String.fromCharCode(0x062a,0x0639,0x062f,0x064a,0x0644,0x0020,0x062d,0x0631,0x0643,0x0629,0x0020,0x0623,0x0633,0x0637,0x0648,0x0644),
    titleNew: String.fromCharCode(0x062d,0x0631,0x0643,0x0629,0x0020,0x0623,0x0633,0x0637,0x0648,0x0644,0x0020,0x062c,0x062f,0x064a,0x062f,0x0629),
    saving: String.fromCharCode(0x062c,0x0627,0x0631,0x064a,0x0020,0x0627,0x0644,0x062d,0x0641,0x0638) + '...',
    save: String.fromCharCode(0x062d,0x0641,0x0638,0x0020,0x062d,0x0631,0x0643,0x0629,0x0020,0x0627,0x0644,0x0623,0x0633,0x0637,0x0648,0x0644),
    cancel: String.fromCharCode(0x0625,0x0644,0x063a,0x0627,0x0621),
};

export default function FleetModal({ isOpen, onClose, initialData = null, vehicles, drivers, onSave, isSaving }: any) {
    const { showToast } = useToast();
    
    const [vehicleId, setVehicleId] = useState('');
    const [driverId, setDriverId] = useState('');
    const [operationDate, setOperationDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState(LBL.open);
    const [notes, setNotes] = useState('');
    const [description, setDescription] = useState('');
    const [recordId, setRecordId] = useState<string | null>(null);

    const [vehicleDisplay, setVehicleDisplay] = useState('');
    const [driverDisplay, setDriverDisplay] = useState('');
    const [driverKey, setDriverKey] = useState(0);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (initialData) {
            setRecordId(initialData.id || null);
            setVehicleId(initialData.vehicle_id || '');
            setDriverId(initialData.driver_id || '');
            setOperationDate(initialData.operation_date || new Date().toISOString().split('T')[0]);
            setStatus(initialData.status || LBL.open);
            setNotes(initialData.notes || '');
            setDescription(initialData.description || '');
            setVehicleDisplay(initialData.vehicle?.plate_number || '');
            setDriverDisplay(initialData.driver?.name || '');
        }
    }, [initialData]);

    const handleSave = useCallback(() => {
        // Only send DB columns - strip out internal UI state
        const payload: any = {
            vehicle_id: vehicleId || null,
            driver_id: driverId || null,
            operation_date: operationDate,
            status: status,
            notes: notes || null,
            description: description || null,
        };
        if (recordId) {
            payload.id = recordId;
        } else {
            payload.operation_number = `FLT-${Date.now().toString().slice(-6)}`;
        }
        onSave(payload);
    }, [vehicleId, driverId, operationDate, status, notes, description, recordId, onSave]);

    if (!mounted || !isOpen) return null;

    return (
        <AquaModalWrapper isOpen={isOpen} onClose={onClose} title={recordId ? LBL.titleEdit : LBL.titleNew}>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <SmartCombo 
                        label={LBL.vehicle}
                        table="fleet_vehicles"
                        searchCols="plate_number"
                        displayCol="plate_number"
                        initialDisplay={vehicleDisplay}
                        onSelect={async (v: any) => {
                            if (!v?.id) {
                                setVehicleId('');
                                setDriverId('');
                                setVehicleDisplay('');
                                setDriverDisplay('');
                                setDriverKey(k => k + 1);
                                return;
                            }
                            setVehicleId(v.id);
                            setVehicleDisplay(v.plate_number || '');
                            try {
                                const { data } = await supabase
                                    .from('fleet_vehicles')
                                    .select('driver_id, driver:partners!driver_id(name)')
                                    .eq('id', v.id)
                                    .single();
                                if (data?.driver_id) {
                                    setDriverId(data.driver_id);
                                    setDriverDisplay((data.driver as any)?.name || '');
                                    setDriverKey(k => k + 1);
                                }
                            } catch (err) {
                                // vehicle selected, driver auto-populate failed - that's ok
                            }
                        }}
                    />
                    <SmartCombo 
                        key={`driver-${driverKey}`}
                        label={LBL.driver}
                        table="partners"
                        searchCols="name"
                        displayCol="name"
                        filterColumn="partner_type"
                        filterValue={LBL.employee}
                        initialDisplay={driverDisplay}
                        onSelect={(u: any) => {
                            if (u?.id) {
                                setDriverId(u.id);
                                setDriverDisplay(u.name || '');
                            } else {
                                setDriverId('');
                                setDriverDisplay('');
                            }
                        }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: '#475569' }}>{LBL.date}</label>
                        <input 
                            type="date"
                            value={operationDate}
                            onChange={e => setOperationDate(e.target.value)}
                            className="glass-input-field"
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 900, color: '#475569' }}>{LBL.status}</label>
                        <select 
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                            className="glass-input-field"
                        >
                            <option value={LBL.open}>{LBL.open}</option>
                            <option value={LBL.closed}>{LBL.closed}</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 900, color: '#475569' }}>{String.fromCharCode(0x0648,0x0635,0x0641,0x0020,0x0627,0x0644,0x0631,0x062d,0x0644,0x0629)}</label>
                    <textarea 
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="glass-input-field"
                        rows={2}
                        placeholder={String.fromCharCode(0x0648,0x0635,0x0641,0x0020,0x062e,0x0637,0x0020,0x0627,0x0644,0x0633,0x064a,0x0631,0x0020,0x0623,0x0648,0x0020,0x0627,0x0644,0x0645,0x0646,0x0637,0x0642,0x0629)}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 900, color: '#475569' }}>{LBL.notes}</label>
                    <textarea 
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="glass-input-field"
                        rows={2}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="btn-main-glass"
                        style={{ flex: 2, background: '#10b981', color: 'white' }}
                    >
                        {isSaving ? LBL.saving : LBL.save}
                    </button>
                    <button 
                        onClick={onClose} 
                        className="btn-main-glass"
                        style={{ flex: 1, background: '#ef4444', color: 'white' }}
                    >
                        {LBL.cancel}
                    </button>
                </div>
            </div>
        </AquaModalWrapper>
    );
}