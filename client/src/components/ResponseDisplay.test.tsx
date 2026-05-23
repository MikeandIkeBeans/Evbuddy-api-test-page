import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResponseDisplay } from './ResponseDisplay';

test('renders ResponseDisplay component', () => {
    render(<ResponseDisplay loading={true} response={null} />);
    const element = screen.getByText(/Loading.../i);
    expect(element).toBeInTheDocument();
});