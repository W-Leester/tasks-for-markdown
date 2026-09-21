import { mount } from 'svelte';
import '../shared/tokens.css';
import StatsApp from './StatsApp.svelte';

mount(StatsApp, { target: document.getElementById('app')! });
