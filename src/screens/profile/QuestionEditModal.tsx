import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { FieldLabel, ModalSheet, SheetActions, SheetError } from './ModalSheet';

/** 编辑题目弹窗的表单数据（与 local-banks 的 QuestionDraft 字段一致） */
export interface QuestionFormDraft {
  /** 编辑既有题目时存在 */
  id?: string;
  title: string;
  difficulty: 1 | 2 | 3;
  tags: string[];
  questionMd: string;
  answerMd: string | null;
}

const DIFFICULTY_OPTIONS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: '简单' },
  { value: 2, label: '中等' },
  { value: 3, label: '困难' },
];

/** 编辑 / 新建一道本地题目：标题、难度、标签、题干 Markdown、参考答案 Markdown（可选） */
export function QuestionEditModal({
  visible,
  initial,
  onSave,
  onClose,
}: {
  visible: boolean;
  /** null 表示新建 */
  initial: QuestionFormDraft | null;
  onSave: (draft: QuestionFormDraft) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [tagsText, setTagsText] = useState('');
  const [questionMd, setQuestionMd] = useState('');
  const [answerMd, setAnswerMd] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle(initial?.title ?? '');
    setDifficulty(initial?.difficulty ?? 2);
    setTagsText(initial?.tags.join('，') ?? '');
    setQuestionMd(initial?.questionMd ?? '');
    setAnswerMd(initial?.answerMd ?? '');
    setError(null);
  }, [visible, initial]);

  function handleSave() {
    const trimmedTitle = title.trim();
    const trimmedQuestion = questionMd.trim();
    if (!trimmedTitle) {
      setError('请填写题目标题');
      return;
    }
    if (!trimmedQuestion) {
      setError('请填写题干内容');
      return;
    }
    const tags = tagsText
      .split(/[，,]/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    onSave({
      id: initial?.id,
      title: trimmedTitle,
      difficulty,
      tags,
      questionMd: trimmedQuestion,
      answerMd: answerMd.trim().length > 0 ? answerMd.trim() : null,
    });
  }

  return (
    <ModalSheet
      visible={visible}
      title={initial ? '编辑题目' : '新增题目'}
      hint="题干与答案都支持 Markdown（列表、代码块、表格）。参考答案留空则视为无答案题。"
      onClose={onClose}
      footer={
        <SheetActions
          confirmLabel="确定"
          onCancel={onClose}
          onConfirm={handleSave}
          confirmDisabled={!title.trim() || !questionMd.trim()}
        />
      }
    >
      <SheetError message={error} />
      <FieldLabel text="标题" />
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="例如：HashMap 的底层实现？"
        placeholderTextColor={colors.textSubtle}
        style={styles.input}
        accessibilityLabel="题目标题"
      />
      <FieldLabel text="难度" />
      <View style={styles.difficultyRow} accessibilityRole="radiogroup">
        {DIFFICULTY_OPTIONS.map((option) => {
          const selected = difficulty === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label}难度`}
              accessibilityState={{ selected }}
              onPress={() => setDifficulty(option.value)}
              style={({ pressed }) => [
                styles.difficultyChip,
                selected && styles.difficultyChipSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.difficultyText, selected && styles.difficultyTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <FieldLabel text="标签（用逗号分隔，可留空）" />
      <TextInput
        value={tagsText}
        onChangeText={setTagsText}
        placeholder="Java，集合"
        placeholderTextColor={colors.textSubtle}
        style={styles.input}
        accessibilityLabel="题目标签"
      />
      <FieldLabel text="题干（Markdown）" />
      <TextInput
        value={questionMd}
        onChangeText={setQuestionMd}
        placeholder="题目描述、要求与背景…"
        placeholderTextColor={colors.textSubtle}
        multiline
        style={[styles.input, styles.multiline]}
        accessibilityLabel="题干内容"
      />
      <FieldLabel text="参考答案（Markdown，可留空）" />
      <TextInput
        value={answerMd}
        onChangeText={setAnswerMd}
        placeholder="参考答案、思路与要点…"
        placeholderTextColor={colors.textSubtle}
        multiline
        style={[styles.input, styles.multiline, styles.answerArea]}
        accessibilityLabel="参考答案内容"
      />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  input: {
    ...typography.body,
    color: colors.text,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
    lineHeight: 20,
  },
  answerArea: { minHeight: 128 },
  difficultyRow: { flexDirection: 'row', gap: spacing.sm },
  difficultyChip: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  difficultyChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
  },
  difficultyText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  difficultyTextSelected: { color: colors.primary, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
