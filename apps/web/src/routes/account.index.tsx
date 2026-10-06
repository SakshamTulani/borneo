import { createFileRoute } from '@tanstack/react-router';
import { AccountOverview } from '../features/account';

export const Route = createFileRoute('/account/')({ component: AccountOverview });
