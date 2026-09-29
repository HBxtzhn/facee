import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLlmConfigStore } from '../../store/llm-config-store';
import { LLM_PRESETS } from '../../lib/llm';
import { colors, radii, spacing, typography } from '../../theme';
import { FieldLabel, ModalSheet, SheetActions, SheetError } from './ModalSheet';

/**
 * AI 设置弹窗：配置 OpenAI 兼容的服务地址 / Key / 模型名。
 * 预设一键填充（DeepSeek / 智谱 / Kimi），也可完全自定义；Key 只存本机。
 */
export function LlmSettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const load = useLlmConfigStore((state) => state.load);
  const save = useLlmConfigStore((state) => state.save);
  const [presetId, setPresetId] = useState('custom');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    void load().then(() => {
      const state = useLlmConfigStore.getState();
      setPresetId(state.presetId);
      setBaseUrl(state.baseUrl);
      setApiKey(state.apiKey);
      setModel(state.model);
    });
  }, [visible, load]);

  function applyPreset(id: string) {
    setPresetId(id);
    const preset = LLM_PRESETS.find((candidate) => candidate.id === id);
    if (preset && preset.baseUrl) {
      setBaseUrl(preset.baseUrl);
      setModel(preset.model);
    }
  }

  async function handleSave() {
    const trimmedBaseUrl = baseUrl.trim();
    if (trimmedBaseUrl && !/^https?:\/\//.test(trimmedBaseUrl)) {
      setError('服务地址必须以 http(s):// 开头');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await save({ presetId, baseUrl: trimmedBaseUrl, apiKey, model });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalSheet
      visible={visible}
      title="AI 设置"
      hint="用于「从文本导入题目」时调用你自己的模型服务（OpenAI 兼容协议）。Key 只保存在本机。"
      onClose={onClose}
      footer={
        <SheetActions
          confirmLabel={saving ? '正在保存' : '保存'}
          confirmLoading={saving}
          onCancel={onClose}
          onConfirm={() => void handleSave()}
        />
      }
    >
      <SheetError message={error} />
      <FieldLabel text="服务商预设" />
      <View style={styles.presetRow}>
        {LLM_PRESETS.map((preset) => {
          const selected = presetId === preset.id;
          return (
            <Pressable
              key={preset.id}
              accessibilityRole="radio"
              accessibilityLabel={preset.label}
              accessibilityState={{ selected }}
              onPress={() => applyPreset(preset.id)}
              style={({ pressed }) => [
                styles.presetChip,
                selected && styles.presetChipSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.presetText, selected && styles.presetTextSelected]}>{preset.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <FieldLabel text="服务地址（不含 /chat/completions）" />
      <TextInput
        value={baseUrl}
        onChangeText={setBaseUrl}
        placeholder="https://api.deepseek.com/v1"
        placeholderTextColor={colors.textSubtle}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={styles.input}
        accessibilityLabel="AI 服务地址"
      />
      <FieldLabel text="API Key" />
      <TextInput
        value={apiKey}
        onChangeText={setApiKey}
        placeholder="sk-…"
        placeholderTextColor={colors.textSubtle}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        style={styles.input}
        accessibilityLabel="AI API Key"
      />
      <FieldLabel text="模型名" />
      <TextInput
        value={model}
        onChangeText={setModel}
        placeholder="deepseek-chat"
        placeholderTextColor={colors.textSubtle}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        accessibilityLabel="AI 模型名"
      />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  presetChip: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
  },
  presetText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  presetTextSelected: { color: colors.primary, fontWeight: '700' },
  input: {
    ...typography.body,
    color: colors.text,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.75 },
});
