import React from 'react';
import { render, screen } from '@testing-library/react';
import ServicesTab from './ServicesTab';

test('renders ServicesTab component', () => {
    render(<ServicesTab />);
    const linkElement = screen.getByText(/services/i);
    expect(linkElement).toBeInTheDocument();
});