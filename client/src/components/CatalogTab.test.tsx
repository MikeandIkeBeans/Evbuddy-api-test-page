import React from 'react';
import { render, screen } from '@testing-library/react';
import CatalogTab from './CatalogTab';

test('renders CatalogTab component with items', () => {
  render(<CatalogTab />);
  const linkElement = screen.getByText(/Catalog/i);
  expect(linkElement).toBeInTheDocument();
});