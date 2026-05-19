import React from 'react';
import { View, ViewStyle } from 'react-native';
import SlideUpView from './SlideUpView';
import { animation } from '../../constants/theme';

interface StaggeredListProps {
  children: React.ReactNode;
  staggerDelay?: number;
  maxDelay?: number;
  animationType?: 'slideUp' | 'scale' | 'fade';
  enabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  itemStyle?: ViewStyle | ViewStyle[];
}

/**
 * StaggeredList - Animates list items with staggered delays
 * 
 * @param children - List items to animate
 * @param staggerDelay - Delay between each item (ms, default: 50)
 * @param maxDelay - Maximum total delay to prevent long waits (ms, default: 300)
 * @param animationType - Type of animation (default: 'slideUp')
 * @param enabled - Whether animation is enabled (default: true)
 * @param style - Container styles
 * @param itemStyle - Styles to apply to each item
 * 
 * @example
 * <StaggeredList staggerDelay={50} maxDelay={300}>
 *   <MenuItem title="Profile" />
 *   <MenuItem title="Settings" />
 *   <MenuItem title="Logout" />
 * </StaggeredList>
 */
export default function StaggeredList({
  children,
  staggerDelay = animation.entrance.staggerDelay,
  maxDelay = animation.entrance.maxStaggerDelay,
  animationType = 'slideUp',
  enabled = true,
  style,
  itemStyle,
}: StaggeredListProps) {
  // Convert children to array
  const childArray = React.Children.toArray(children);

  // Import animation components dynamically based on type
  const AnimationComponent = animationType === 'slideUp' 
    ? require('./SlideUpView').default
    : animationType === 'scale'
    ? require('./ScaleInView').default
    : require('./FadeInView').default;

  return (
    <View style={style}>
      {childArray.map((child, index) => {
        // Calculate delay with cap
        const delay = Math.min(index * staggerDelay, maxDelay);
        
        return (
          <AnimationComponent
            key={index}
            delay={delay}
            enabled={enabled}
            style={itemStyle}
          >
            {child}
          </AnimationComponent>
        );
      })}
    </View>
  );
}

