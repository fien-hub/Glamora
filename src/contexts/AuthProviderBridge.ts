// Bridge module: re-exports AuthProvider as the default export so that
// dynamic import() in Hermes returns { default: AuthProvider } directly.
// This is needed because Hermes dynamic import() does not expose named
// exports from modules that have no default export.
import { AuthProvider } from './AuthContext';
export default AuthProvider;
