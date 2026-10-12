import Icon from './icon.svg?react';
import styles from './Card.module.scss';

/** Normal local symbol for NINT-01 non-interference check. */
export function helper(): number {
  return 42;
}

export const localValue = helper();

export function Demo() {
  void Icon;
  void styles;
  return localValue;
}
