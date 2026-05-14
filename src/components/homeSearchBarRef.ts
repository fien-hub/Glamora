import { createRef } from 'react';
import { TouchableOpacity } from 'react-native';

/**
 * Module-level ref for the search bar in HomeHeader.
 * HomeHeader writes to it; HomeScreen reads it for the tour spotlight.
 */
export const homeSearchBarRef = createRef<TouchableOpacity>();
