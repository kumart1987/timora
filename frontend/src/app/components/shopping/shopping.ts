import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-shopping',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule
  ],
  templateUrl: './shopping.html',
  styleUrl: './shopping.scss'
})
export class Shopping implements OnInit {
  shoppingList: any[] = [];
  displayedColumns = ['date', 'item_name', 'category', 'price', 'invoice', 'actions'];

  // Form State
  shoppingForm!: FormGroup;
  isFormOpen = false;
  selectedFile: File | null = null;
  filePreviewUrl: string | null = null;
  fileType: string | null = null;
  isSubmitting = false;

  // Invoice viewer modal state
  activeInvoiceUrl: string | null = null;
  activeInvoiceType: string | null = null;
  activeInvoiceName: string | null = null;

  categories = ['Clothes', 'Electronics', 'Groceries', 'Home & Kitchen', 'Gifts', 'Books', 'Other'];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadShoppingItems();
  }

  initForm() {
    const today = new Date().toISOString().split('T')[0];
    this.shoppingForm = this.fb.group({
      item_name: ['', Validators.required],
      category: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      date: [today, Validators.required]
    });
    this.selectedFile = null;
    this.filePreviewUrl = null;
    this.fileType = null;
  }

  loadShoppingItems() {
    this.api.getShopping().subscribe({
      next: (items) => {
        this.shoppingList = items;
      },
      error: (err) => console.error('Error loading shopping:', err)
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.fileType = file.type;

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          this.filePreviewUrl = reader.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        this.filePreviewUrl = null; // No image preview for PDFs
      }
    }
  }

  openAddForm() {
    this.initForm();
    this.isFormOpen = true;
  }

  closeForm() {
    this.isFormOpen = false;
    this.shoppingForm.reset();
  }

  onSubmit() {
    if (this.shoppingForm.invalid) return;

    this.isSubmitting = true;
    const formVal = this.shoppingForm.value;

    const formData = new FormData();
    formData.append('item_name', formVal.item_name);
    formData.append('category', formVal.category);
    formData.append('price', formVal.price.toString());
    formData.append('date', formVal.date);

    if (this.selectedFile) {
      formData.append('invoice', this.selectedFile);
    }

    this.api.addShopping(formData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.snackBar.open('Shopping log and invoice saved', 'Dismiss', { duration: 3000 });
        this.closeForm();
        this.loadShoppingItems();
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err.error?.message || 'Error occurred while saving shopping log';
        this.snackBar.open(msg, 'Dismiss', { duration: 5000 });
      }
    });
  }

  deleteItem(id: number) {
    if (confirm('Delete this shopping item and its invoice details?')) {
      this.api.deleteShopping(id).subscribe({
        next: () => {
          this.snackBar.open('Item deleted successfully', 'Dismiss', { duration: 3000 });
          this.loadShoppingItems();
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Error deleting item', 'Dismiss', { duration: 5000 });
        }
      });
    }
  }

  viewInvoice(item: any) {
    if (!item.invoice_path) return;
    
    // Server uploads are stored relative to backend. Map it to http resource.
    const filename = item.invoice_path.split('/').pop();
    this.activeInvoiceUrl = `http://localhost:5000/uploads/${filename}`;
    this.activeInvoiceType = item.invoice_type;
    this.activeInvoiceName = item.invoice_filename;
  }

  closeInvoiceViewer() {
    this.activeInvoiceUrl = null;
    this.activeInvoiceType = null;
    this.activeInvoiceName = null;
  }
}
