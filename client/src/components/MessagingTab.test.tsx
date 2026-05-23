import React from 'react';
import { render, screen } from '@testing-library/react';
import MessagingTab from './MessagingTab';

test('renders MessagingTab component', () => {
	render(<MessagingTab />);
	const linkElement = screen.getByRole('button', { name: /Threads/i });
	expect(linkElement).toBeInTheDocument();
});