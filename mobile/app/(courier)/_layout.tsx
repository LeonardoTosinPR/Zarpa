import React from 'react';
import { Stack } from 'expo-router';

export default function CourierLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
