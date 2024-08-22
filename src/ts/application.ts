import '../styles/globals.css';

import { Application } from '@hotwired/stimulus';
import { registerControllers } from 'stimulus-vite-helpers';

const application = Application.start();
const controllers = import.meta.glob('./**/*-controller.ts', { eager: true });
registerControllers(application, controllers);
