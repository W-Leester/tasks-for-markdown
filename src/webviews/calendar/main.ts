import { mount } from 'svelte';
import '../shared/tokens.css';
import CalendarApp from './CalendarApp.svelte';

mount(CalendarApp, { target: document.getElementById('app')! });
