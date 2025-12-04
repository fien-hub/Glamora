# Performance Optimization Guide for Glamora

## 📋 Overview

This guide covers performance optimizations for the Glamora React Native app.

## 🎯 Key Areas

1. **Image Loading** - Optimize image loading and caching
2. **Data Fetching** - Efficient API calls and caching
3. **List Rendering** - Optimize FlatList performance
4. **Memory Management** - Prevent memory leaks
5. **Bundle Size** - Reduce app size

## 🖼️ Image Optimization

### Step 1: Install Fast Image

```bash
cd glamora-app
npx expo install expo-image
```

### Step 2: Replace Image Components

Replace `<Image>` with `<ExpoImage>`:

```typescript
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  style={styles.image}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
  placeholder={require('../assets/placeholder.png')}
/>
```

### Step 3: Image Compression

Compress uploaded images before sending to Supabase:

```typescript
import * as ImageManipulator from 'expo-image-manipulator';

async function compressImage(uri: string) {
  const manipResult = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }], // Max width 1200px
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return manipResult.uri;
}
```

### Step 4: Lazy Loading

Load images only when visible:

```typescript
import { useInView } from 'react-native-intersection-observer';

function ImageCard({ imageUrl }) {
  const { ref, inView } = useInView();
  
  return (
    <View ref={ref}>
      {inView && <Image source={{ uri: imageUrl }} />}
    </View>
  );
}
```

## 📊 Data Fetching Optimization

### Step 1: Install React Query

```bash
npm install @tanstack/react-query
```

### Step 2: Setup Query Client

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
    </QueryClientProvider>
  );
}
```

### Step 3: Use Queries

```typescript
import { useQuery } from '@tanstack/react-query';

function BookingsScreen() {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings', providerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('provider_id', providerId);
      return data;
    },
  });
}
```

### Step 4: Pagination

Implement pagination for large lists:

```typescript
const PAGE_SIZE = 20;

const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['bookings'],
  queryFn: async ({ pageParam = 0 }) => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .range(pageParam, pageParam + PAGE_SIZE - 1);
    return data;
  },
  getNextPageParam: (lastPage, pages) => {
    return lastPage.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined;
  },
});
```

## 📜 List Rendering Optimization

### Optimize FlatList

```typescript
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  // Performance props
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={10}
  windowSize={5}
  // Use getItemLayout if items have fixed height
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

### Memoize List Items

```typescript
const renderItem = useCallback(({ item }) => (
  <MemoizedListItem item={item} />
), []);

const MemoizedListItem = React.memo(({ item }) => (
  <View>
    <Text>{item.name}</Text>
  </View>
));
```

## 🧠 Memory Management

### Cleanup Subscriptions

```typescript
useEffect(() => {
  const subscription = supabase
    .channel('bookings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, handleChange)
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### Cleanup Timers

```typescript
useEffect(() => {
  const timer = setInterval(() => {
    // Do something
  }, 1000);

  return () => clearInterval(timer);
}, []);
```

### Avoid Memory Leaks

```typescript
useEffect(() => {
  let isMounted = true;

  async function fetchData() {
    const data = await fetchSomething();
    if (isMounted) {
      setData(data);
    }
  }

  fetchData();

  return () => {
    isMounted = false;
  };
}, []);
```

## 📦 Bundle Size Optimization

### Step 1: Analyze Bundle

```bash
npx expo-bundle-analyzer
```

### Step 2: Code Splitting

Use dynamic imports for large screens:

```typescript
const AnalyticsScreen = lazy(() => import('./screens/AnalyticsScreen'));

<Suspense fallback={<LoadingScreen />}>
  <AnalyticsScreen />
</Suspense>
```

### Step 3: Remove Unused Dependencies

```bash
npm install -g depcheck
depcheck
```

## ⚡ React Performance

### Use useMemo

```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

### Use useCallback

```typescript
const handlePress = useCallback(() => {
  doSomething(id);
}, [id]);
```

### Avoid Inline Functions

```typescript
// ❌ Bad - creates new function on every render
<Button onPress={() => handlePress(id)} />

// ✅ Good - memoized function
const onPress = useCallback(() => handlePress(id), [id]);
<Button onPress={onPress} />
```

## 🔍 Debugging Performance

### Enable Performance Monitor

```typescript
import { enableScreens } from 'react-native-screens';
enableScreens();
```

### Use Flipper

Install Flipper for debugging:
- Network inspector
- Layout inspector
- Performance monitor
- Database inspector

### React DevTools Profiler

```bash
npm install -g react-devtools
react-devtools
```

## 📊 Monitoring

### Add Performance Tracking

```typescript
import * as Performance from 'expo-performance';

// Track screen load time
const startTime = Performance.now();
// ... load screen
const endTime = Performance.now();
console.log(`Screen loaded in ${endTime - startTime}ms`);
```

## ✅ Performance Checklist

- [ ] Replace Image with expo-image
- [ ] Compress images before upload
- [ ] Implement pagination for lists
- [ ] Add React Query for data fetching
- [ ] Optimize FlatList with performance props
- [ ] Memoize expensive computations
- [ ] Clean up subscriptions and timers
- [ ] Remove unused dependencies
- [ ] Enable Hermes engine
- [ ] Test on low-end devices
- [ ] Monitor bundle size
- [ ] Profile with React DevTools

## 🎯 Target Metrics

- **App Launch**: < 2 seconds
- **Screen Navigation**: < 300ms
- **API Response**: < 1 second
- **Image Load**: < 500ms
- **List Scroll**: 60 FPS
- **Bundle Size**: < 50MB

## 📞 Resources

- **React Native Performance**: [reactnative.dev/docs/performance](https://reactnative.dev/docs/performance)
- **Expo Performance**: [docs.expo.dev/guides/performance](https://docs.expo.dev/guides/performance/)

