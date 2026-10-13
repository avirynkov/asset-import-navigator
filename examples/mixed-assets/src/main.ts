import logo from './assets/logo.svg';
import './theme.css';
import { formatLabel } from './utils';
import { Button } from 'ui-kit';

const notAnImport = '/assets/logo.svg';

export async function load(): Promise<unknown> {
  const res = await fetch('/assets/logo.svg');
  return [logo, formatLabel('x'), Button(), notAnImport, res.status];
}
