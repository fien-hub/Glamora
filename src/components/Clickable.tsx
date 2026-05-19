import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { soundService } from '../services/soundService';

interface ClickableProps extends TouchableOpacityProps {
  children: React.ReactNode;
  disableSound?: boolean;
}

export const Clickable: React.FC<ClickableProps> = ({ 
  children, 
  onPress, 
  disableSound = false,
  ...props 
}) => {
  const handlePress = async (event: any) => {
    if (!disableSound) {
      await soundService.playClick();
    }
    if (onPress) {
      onPress(event);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} {...props}>
      {children}
    </TouchableOpacity>
  );
};
