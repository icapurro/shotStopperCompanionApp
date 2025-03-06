import React, { useState, useEffect } from 'react';
import { BleManager } from 'react-native-ble-manager';

export const useShotStopper = (serviceUUID, characteristicUUIDs) => {
  // ... (other state variables)

  const [isWriting, setIsWriting] = useState(false);

  // ... (useEffect and helper functions)

  // Functions to set values (implement write characteristics)
  const setBrewWeight = async (value) => {
    try {
      setIsWriting(true); // Set writing state to true
      const data = [value]; // Convert value to data array
      await BleManager.write(peripheralId, serviceUUID, characteristicUUIDs.brewWeight, data);
    } catch (error) {
      console.error('Error writing brew weight:', error);
    } finally {
      setIsWriting(false); // Set writing state to false in finally block
    }
  };

  // ... (other setter functions with similar isWriting logic)

  return {
    // ... (other return values)
    isWriting,
  };
};