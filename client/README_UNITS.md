# Unit Management System

This document describes the Unit management functionality that has been added to the inventory management system.

## Overview

The Unit management system allows users to create, edit, delete, and manage units of measurement for products in the inventory system. Units are used to specify how products are measured (e.g., pieces, kg, liters, etc.).

## Features

### 1. Add New Units
- Create new units with a name and optional description
- Duplicate unit names are prevented
- Form validation ensures required fields are filled

### 2. Edit Existing Units
- Click the "Edit" button to modify unit details
- Update both name and description
- Changes are saved immediately

### 3. Delete Units
- Individual unit deletion with confirmation
- Bulk deletion of multiple selected units
- Soft delete system (units are marked as deleted but not permanently removed)

### 4. View Units
- Table view showing all active units
- Sortable by name
- Shows unit name and description
- Checkbox selection for bulk operations

### 5. Search and Filter
- Search functionality (planned for future enhancement)
- Sort units alphabetically by name

## Navigation

### Accessing the Unit Management Page

1. **From Dashboard**: Click on the "Units" link in the sidebar
2. **Direct URL**: Navigate to `/unit`
3. **From Inventory Manager**: Click on the "Units" navigation link

### Navigation Links

The Unit management page includes navigation to:
- Dashboard
- Inventory Management
- Categories
- Map Display
- Kiosk
- Logout

## API Endpoints

The following backend endpoints are available for unit management:

### GET /units
- Retrieves all active units
- Returns sorted list by name

### POST /units
- Creates a new unit
- Requires: `name` (string), `description` (optional string)

### PUT /units/:id
- Updates an existing unit
- Requires: `name` (string), `description` (optional string)

### DELETE /units/:id
- Soft deletes a unit (marks as deleted)
- Unit is not permanently removed

## Database Schema

```javascript
const unitSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  deletedAt: { type: Date, default: null },
}, {
  timestamps: true
});
```

## Default Units

The system automatically initializes with the following default units if none exist:

1. **pieces** - Individual items
2. **boxes** - Boxed items
3. **kg** - Kilograms
4. **grams** - Grams
5. **liters** - Liters
6. **meters** - Meters
7. **pairs** - Pairs of items
8. **sets** - Sets of items
9. **bottles** - Bottled items
10. **cans** - Canned items

## Usage in Product Management

Units created in this system are automatically available in:
- Add Product form
- Edit Product form
- Product listings
- Inventory management

## User Interface

### Main Features
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Clean, professional interface with consistent styling
- **Real-time Feedback**: Success/error messages via snackbar notifications
- **Confirmation Dialogs**: Prevents accidental deletions

### Styling
- Consistent with the existing application design
- Uses the same color scheme and component patterns
- Responsive layout that adapts to different screen sizes

## Error Handling

The system includes comprehensive error handling:
- Network request failures
- Validation errors
- Duplicate unit names
- Server errors

All errors are displayed to the user with appropriate messages.

## Future Enhancements

Potential improvements for the Unit management system:
1. Search functionality
2. Advanced filtering options
3. Unit conversion capabilities
4. Import/export functionality
5. Unit usage statistics
6. Unit categories or groups

## Technical Implementation

### Frontend
- React.js component (`Unit.jsx`)
- Uses React hooks for state management
- Axios for API communication
- React Router for navigation

### Backend
- Express.js server
- MongoDB with Mongoose ODM
- RESTful API design
- Soft delete implementation

### Dependencies
- React Icons for UI icons
- Axios for HTTP requests
- React Router for navigation

## Getting Started

1. Ensure the server is running on `http://localhost:5000`
2. Navigate to the Unit management page
3. Start adding, editing, or managing units as needed
4. Units will be automatically available in product management

## Troubleshooting

### Common Issues

1. **Units not appearing in product forms**
   - Ensure the server is running
   - Check browser console for API errors
   - Verify database connection

2. **Cannot add duplicate units**
   - This is expected behavior
   - Use a different name for the unit

3. **Units not saving**
   - Check network connectivity
   - Verify server is running
   - Check browser console for errors

### Support

For technical issues or questions about the Unit management system, refer to the main project documentation or contact the development team.

