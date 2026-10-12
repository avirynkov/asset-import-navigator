import Icon from './icon.svg?react';
import logo from './logo.svg';
import styles from './Card.module.css';
import scss from './Card.module.scss';

export function helper(): number {
  return 42;
}

export const localValue = helper();

export function Demo() {
  void Icon;
  void logo;
  void styles;
  void scss;
  return localValue;
}
