import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setUserName } from '../storage/storage';
import { colors } from '../theme';

const SUGGESTIONS = ['Zach'];

export default function IdentityScreen({ onDone }) {
  const [name, setName] = useState('');

  async function confirm() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await setUserName(trimmed);
    onDone(trimmed);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Text style={styles.emoji}>🏋️</Text>
        <Text style={styles.title}>QUI ES-TU ?</Text>
        <Text style={styles.subtitle}>
          Tape ton prénom — toutes tes séances{'\n'}seront synchronisées sous ce nom.
        </Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ton prénom..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={confirm}
          autoFocus
        />

        <View style={styles.suggestions}>
          {SUGGESTIONS.map(s => (
            <TouchableOpacity
              key={s}
              style={styles.chip}
              onPress={() => setName(s)}
            >
              <Text style={styles.chipText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, !name.trim() && styles.btnDisabled]}
          onPress={confirm}
          activeOpacity={0.8}
          disabled={!name.trim()}
        >
          <Text style={styles.btnText}>C'EST PARTI 🚀</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 2,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  input: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  suggestions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 36,
  },
  chip: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  btn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 18,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
