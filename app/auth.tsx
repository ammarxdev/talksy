import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/AlertContext';
import { router } from 'expo-router';
import { AuthGuard } from '@/components/AuthGuard';

type AuthMode = 'login' | 'signup' | 'verification';

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, signInWithGoogle, resendVerification } = useAuth();
  const { showError, showSuccess, showInfo } = useAlert();

  const handleEmailAuth = async () => {
    if (!email || !password) {
      showError('Please fill in all fields', 'Missing Information');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      showError('Passwords do not match', 'Password Mismatch');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters', 'Invalid Password');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          showError(error.message, 'Login Failed');
        } else {
          router.replace('/(tabs)');
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) {
          showError(error.message, 'Signup Failed');
        } else {
          setMode('verification');
          showSuccess(
            'We sent you a verification link. Please check your email and click the link to verify your account.',
            'Check Your Email'
          );
        }
      }
    } catch (error) {
      showError('Something went wrong. Please try again.', 'Unexpected Error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        showError(error.message, 'Google Sign In Failed');
      }
    } catch (error) {
      showError('Google sign in failed. Please try again.', 'Authentication Error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      showError('Please enter your email address', 'Email Required');
      return;
    }

    setLoading(true);
    try {
      const { error } = await resendVerification(email);
      if (error) {
        showError(error.message, 'Verification Failed');
      } else {
        showSuccess('Verification email sent!', 'Email Sent');
      }
    } catch (error) {
      showError('Failed to send verification email', 'Network Error');
    } finally {
      setLoading(false);
    }
  };

  const renderLoginForm = () => (
    <>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Sign in to your account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleEmailAuth}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Signing In...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleAuth}
        disabled={loading}
      >
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMode('signup')}>
        <Text style={styles.linkText}>
          Don't have an account? <Text style={styles.linkHighlight}>Sign Up</Text>
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderSignupForm = () => (
    <>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join us today</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#999"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleEmailAuth}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleAuth}
        disabled={loading}
      >
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMode('login')}>
        <Text style={styles.linkText}>
          Already have an account? <Text style={styles.linkHighlight}>Sign In</Text>
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderVerificationScreen = () => (
    <>
      <Text style={styles.title}>Check Your Email</Text>
      <Text style={styles.subtitle}>
        We sent a verification link to {email}
      </Text>

      <View style={styles.verificationContainer}>
        <Text style={styles.verificationText}>
          Please check your email and click the verification link to activate your account.
        </Text>

        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResendVerification}
          disabled={loading}
        >
          <Text style={styles.resendButtonText}>
            {loading ? 'Sending...' : 'Resend Verification Email'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMode('login')}>
          <Text style={styles.linkText}>
            Back to <Text style={styles.linkHighlight}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <AuthGuard requireAuth={false}>
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Modern header section */}
              <View style={styles.headerSection}>
                <View style={styles.brandContainer}>
                  <View style={styles.logoPlaceholder}>
                    {/* Professional microphone icon */}
                    <View style={styles.micIcon}>
                      <View style={styles.micBody} />
                      <View style={styles.micStand} />
                      <View style={styles.micBase} />
                    </View>
                  </View>
                  <Text style={styles.appTitle}>Voice Assistant</Text>
                  <Text style={styles.appSubtitle}>Your AI-powered companion</Text>
                </View>
              </View>

              {/* Form section */}
              <View style={styles.formContainer}>
                {mode === 'login' && renderLoginForm()}
                {mode === 'signup' && renderSignupForm()}
                {mode === 'verification' && renderVerificationScreen()}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // Clean light background
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  // New header section styles
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brandContainer: {
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Microphone icon styles
  micIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBody: {
    width: 20,
    height: 32,
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 4,
  },
  micStand: {
    width: 2,
    height: 12,
    backgroundColor: 'white',
    marginBottom: 2,
  },
  micBase: {
    width: 16,
    height: 3,
    backgroundColor: 'white',
    borderRadius: 1.5,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '400',
  },
  // Updated form container
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    marginHorizontal: 4,
    shadowColor: '#0f172a',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#64748b',
    fontWeight: '400',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    color: '#0f172a',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonText: {
    color: '#0f172a',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    textAlign: 'center',
    fontSize: 15,
    color: '#64748b',
    marginTop: 16,
    fontWeight: '400',
  },
  linkHighlight: {
    color: '#2563eb',
    fontWeight: '600',
  },
  verificationContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  verificationText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#64748b',
    marginBottom: 32,
    lineHeight: 24,
    fontWeight: '400',
  },
  resendButton: {
    backgroundColor: '#28a745',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    minWidth: 200,
  },
  resendButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
