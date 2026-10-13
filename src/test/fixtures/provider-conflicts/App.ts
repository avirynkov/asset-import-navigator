import { pkgFn } from 'fake-pkg';
import styles from './Card.module.css';
import { localFn } from './local';

const assetPath = '/assets/x.svg';

export function run(): unknown {
  void fetch('/a.svg');
  return [pkgFn(), legitGlobal.x, styles.foo, localFn(), assetPath];
}
