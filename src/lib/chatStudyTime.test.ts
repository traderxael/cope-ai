// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  CHAT_ACTIVE_WINDOW_MS,
  isChatStudyActive,
  useChatStudyMinutes,
} from './chatStudyTime';
import { studyMinutesToday } from './studyLog';

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 8, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('isChatStudyActive', () => {
  const now = Date.now();

  it('cuenta cuando la pestaña está visible y hubo actividad reciente', () => {
    expect(isChatStudyActive(now - 60_000, now, true)).toBe(true);
  });

  it('cuenta en el borde exacto de la ventana de actividad', () => {
    expect(isChatStudyActive(now - CHAT_ACTIVE_WINDOW_MS, now, true)).toBe(true);
  });

  it('no cuenta cuando la actividad quedó vieja', () => {
    expect(isChatStudyActive(now - CHAT_ACTIVE_WINDOW_MS - 1, now, true)).toBe(false);
  });

  it('no cuenta con la pestaña oculta', () => {
    expect(isChatStudyActive(now - 1000, now, false)).toBe(false);
  });

  it('no cuenta sin actividad registrada', () => {
    expect(isChatStudyActive(0, now, true)).toBe(false);
    expect(isChatStudyActive(Number.NaN, now, true)).toBe(false);
  });

  it('no cuenta actividad en el futuro', () => {
    expect(isChatStudyActive(now + 1000, now, true)).toBe(false);
  });
});

describe('useChatStudyMinutes', () => {
  it('suma un minuto por cada minuto activo de chat', () => {
    const { rerender } = renderHook(
      ({ at }) => useChatStudyMinutes(at),
      { initialProps: { at: Date.now() } },
    );
    vi.advanceTimersByTime(60_000);
    expect(studyMinutesToday()).toBe(1);
    rerender({ at: Date.now() });
    vi.advanceTimersByTime(60_000);
    expect(studyMinutesToday()).toBe(2);
  });

  it('deja de sumar cuando la actividad queda vieja', () => {
    const { rerender } = renderHook(
      ({ at }) => useChatStudyMinutes(at),
      { initialProps: { at: Date.now() } },
    );
    vi.advanceTimersByTime(60_000);
    expect(studyMinutesToday()).toBe(1);
    rerender({ at: Date.now() - CHAT_ACTIVE_WINDOW_MS - 60_000 });
    vi.advanceTimersByTime(120_000);
    expect(studyMinutesToday()).toBe(1);
  });

  it('no suma con la pestaña oculta', () => {
    const spy = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden');
    renderHook(() => useChatStudyMinutes(Date.now()));
    vi.advanceTimersByTime(120_000);
    expect(studyMinutesToday()).toBe(0);
    spy.mockRestore();
  });
});