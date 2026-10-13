import MenuIcon from '@/assets/icons/menu.svg?react';
import styles from '@/styles/header.module.scss';

export function Header() {
  return [MenuIcon({}), styles.header];
}
