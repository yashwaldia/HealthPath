// Fix: Add TypeScript type definitions for the Web Bluetooth API to resolve compilation errors.
// These definitions are typically provided by including "web-bluetooth" in tsconfig.json `lib`.
declare global {
    interface Navigator {
        bluetooth: {
            requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
        };
    }

    interface BluetoothDevice extends EventTarget {
        readonly id: string;
        readonly name?: string;
        readonly gatt?: BluetoothRemoteGATTServer;
    }

    interface BluetoothRemoteGATTServer {
        readonly device: BluetoothDevice;
        readonly connected: boolean;
        connect(): Promise<BluetoothRemoteGATTServer>;
        disconnect(): void;
        getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
    }

    interface BluetoothRemoteGATTService {
        getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
    }

    interface BluetoothRemoteGATTCharacteristic {
        readValue(): Promise<DataView>;
    }

    interface RequestDeviceOptions {
        filters?: any[];
        optionalServices?: string[];
    }
}

import React, { useState, useCallback } from 'react';
import { VitalRecord } from '../types';
import { BluetoothIcon, SyncIcon, CloseIcon } from './Icons';

interface BluetoothHealthSyncProps {
    onDataSynced: (data: Partial<VitalRecord>) => void;
}

// Define known GATT services and characteristics
const HEALTH_SERVICES = {
    HEART_RATE: 'heart_rate',
    HEALTH_THERMOMETER: 'health_thermometer',
    BLOOD_PRESSURE: 'blood_pressure',
};
const CHARACTERISTICS = {
    HEART_RATE_MEASUREMENT: 'heart_rate_measurement',
    TEMPERATURE_MEASUREMENT: 'temperature_measurement',
    BLOOD_PRESSURE_MEASUREMENT: 'blood_pressure_measurement',
};

// Data for permission modal
const PERMISSION_ITEMS: { key: keyof VitalRecord, label: string }[] = [
    { key: 'heartRate', label: 'Heart Rate' },
    { key: 'temperature', label: 'Body Temperature' },
    { key: 'bloodPressureSystolic', label: 'Blood Pressure' },
    // Add other potential metrics here as support is expanded
];

const BluetoothHealthSync: React.FC<BluetoothHealthSyncProps> = ({ onDataSynced }) => {
    const [device, setDevice] = useState<BluetoothDevice | null>(null);
    const [status, setStatus] = useState<'Disconnected' | 'Connecting...' | 'Connected'>('Disconnected');
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [error, setError] = useState<string>('');
    const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});

    const handlePermissionChange = (key: string, isChecked: boolean) => {
        setPermissions(prev => ({ ...prev, [key]: isChecked }));
    };

    const handleAllowAccess = () => {
        setIsPermissionModalOpen(false);
        if (device) {
            handleSync();
        }
    };

    const handleConnect = useCallback(async () => {
        if (!navigator.bluetooth) {
            setError('Web Bluetooth API is not available on this browser.');
            return;
        }
        setStatus('Connecting...');
        setError('');
        try {
            const btDevice = await navigator.bluetooth.requestDevice({
                filters: [{ services: [HEALTH_SERVICES.HEART_RATE, HEALTH_SERVICES.HEALTH_THERMOMETER] }],
                optionalServices: [HEALTH_SERVICES.BLOOD_PRESSURE]
            });
            setDevice(btDevice);
            btDevice.addEventListener('gattserverdisconnected', () => {
                setStatus('Disconnected');
                setDevice(null);
            });
            const server = await btDevice.gatt?.connect();
            if (server) {
                setStatus('Connected');
                setIsPermissionModalOpen(true); // Ask for permissions on first connect
            }
        } catch (err: any) {
            // Gracefully handle user cancellation of the device picker.
            if (err.name === 'NotFoundError') {
                console.log('User cancelled device selection.');
                // Don't set an error message, just reset status.
            } else {
                console.error('Bluetooth connection error:', err);
                setError(`Connection failed: ${err.message}`);
            }
            setStatus('Disconnected');
        }
    }, []);

    const handleSync = useCallback(async () => {
        if (!device?.gatt?.connected) {
            setError('Device not connected.');
            return;
        }
        setError('');
        let syncedData: Partial<VitalRecord> = {};
        
        try {
            const server = device.gatt;
            // Heart Rate
            if (permissions.heartRate) {
                try {
                    const hrService = await server.getPrimaryService(HEALTH_SERVICES.HEART_RATE);
                    const hrChar = await hrService.getCharacteristic(CHARACTERISTICS.HEART_RATE_MEASUREMENT);
                    const value = await hrChar.readValue();
                    const heartRate = value.getUint8(1);
                    syncedData.heartRate = heartRate.toString();
                } catch (e) { console.warn("Heart rate service not found/readable."); }
            }
            // Temperature
            if (permissions.temperature) {
                try {
                    const tempService = await server.getPrimaryService(HEALTH_SERVICES.HEALTH_THERMOMETER);
                    const tempChar = await tempService.getCharacteristic(CHARACTERISTICS.TEMPERATURE_MEASUREMENT);
                    const value = await tempChar.readValue();
                    const temperature = value.getFloat32(1, true);
                    syncedData.temperature = temperature.toFixed(1);
                } catch (e) { console.warn("Temperature service not found/readable."); }
            }
            // Blood Pressure
            if (permissions.bloodPressureSystolic) {
                try {
                    const bpService = await server.getPrimaryService(HEALTH_SERVICES.BLOOD_PRESSURE);
                    const bpChar = await bpService.getCharacteristic(CHARACTERISTICS.BLOOD_PRESSURE_MEASUREMENT);
                    const value = await bpChar.readValue();
                    const systolic = value.getUint16(1, true);
                    const diastolic = value.getUint16(3, true);
                    syncedData.bloodPressureSystolic = systolic.toString();
                    syncedData.bloodPressureDiastolic = diastolic.toString();
                } catch (e) { console.warn("Blood pressure service not found/readable."); }
            }
            
            if (Object.keys(syncedData).length > 0) {
                onDataSynced(syncedData);
                setLastSyncTime(new Date());
            } else {
                setError("No permitted data could be read from the device.");
            }
        } catch (err: any) {
            setError(`Sync failed: ${err.message}`);
        }
    }, [device, onDataSynced, permissions]);

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-md">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2"> Health-e Sync</h3>
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            
            {!device ? (
                <button onClick={handleConnect} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-light/20 text-primary-dark dark:text-primary-light font-semibold rounded-lg">
                    <BluetoothIcon className="w-5 h-5"/> Connect Device via Bluetooth
                </button>
            ) : (
                <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
                    <p><strong>Device:</strong> {device.name || 'Unknown Device'}</p>
                    <p><strong>Status:</strong> <span className={status === 'Connected' ? 'text-green-500' : 'text-yellow-500'}>{status}</span></p>
                    <p><strong>Last Sync:</strong> {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Never'}</p>
                    <div className="flex gap-2 pt-2">
                        <button onClick={handleSync} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-white font-semibold rounded-lg"><SyncIcon className="w-5 h-5"/> Sync Now</button>
                        <button onClick={() => setIsPermissionModalOpen(true)} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 font-semibold rounded-lg">Permissions</button>
                    </div>
                </div>
            )}
            
            {isPermissionModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 animate-fade-in-up">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
                        <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold">"Health-e" Permissions</h3>
                             <button onClick={() => setIsPermissionModalOpen(false)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><CloseIcon className="w-5 h-5"/></button>
                        </header>
                        <div className="p-6 space-y-3">
                            <p className="text-sm text-slate-500">Allow "Health-e" to write the following data from your connected device:</p>
                            {PERMISSION_ITEMS.map(item => (
                                <label key={item.key} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50">
                                    <input
                                        type="checkbox"
                                        checked={!!permissions[item.key]}
                                        onChange={(e) => handlePermissionChange(item.key, e.target.checked)}
                                        className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    <span className="font-medium text-sm">{item.label}</span>
                                </label>
                            ))}
                        </div>
                        <footer className="p-4 border-t border-slate-200 dark:border-slate-700">
                             <button onClick={handleAllowAccess} className="w-full px-4 py-2 bg-primary text-white font-bold rounded-lg">Allow Access</button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BluetoothHealthSync;