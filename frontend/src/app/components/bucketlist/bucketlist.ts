import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
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
  selector: 'app-bucketlist',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule
  ],
  templateUrl: './bucketlist.html',
  styleUrl: './bucketlist.scss'
})
export class BucketList implements OnInit {
  bucketList: any[] = [];
  displayedColumns = ['title', 'description', 'target_date', 'status', 'actions'];

  // Form State
  bucketForm!: FormGroup;
  isFormOpen = false;
  editingId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadBucketList();
  }

  initForm() {
    this.bucketForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      target_date: [''],
      status: ['Pending', Validators.required]
    });
  }

  loadBucketList() {
    this.api.getBucketList().subscribe({
      next: (data) => {
        this.bucketList = data;
      },
      error: (err) => console.error('Error loading bucket list:', err)
    });
  }

  openAddForm() {
    this.editingId = null;
    this.initForm();
    this.isFormOpen = true;
  }

  openEditForm(item: any) {
    this.editingId = item.id;
    this.bucketForm = this.fb.group({
      title: [item.title, Validators.required],
      description: [item.description || ''],
      target_date: [item.target_date ? item.target_date.split('T')[0] : ''],
      status: [item.status, Validators.required]
    });
    this.isFormOpen = true;
  }

  closeForm() {
    this.isFormOpen = false;
    this.editingId = null;
    this.bucketForm.reset();
  }

  updateStatus(item: any, newStatus: string) {
    const updatedData = {
      title: item.title,
      description: item.description,
      target_date: item.target_date,
      status: newStatus
    };

    this.api.updateBucketListItem(item.id, updatedData).subscribe({
      next: () => {
        this.snackBar.open(`Status updated to ${newStatus}`, 'Dismiss', { duration: 3000 });
        this.loadBucketList();
      },
      error: (err) => {
        const msg = err.error?.message || 'Error updating status';
        this.snackBar.open(msg, 'Dismiss', { duration: 5000 });
      }
    });
  }

  onSubmit() {
    if (this.bucketForm.invalid) return;

    const val = this.bucketForm.value;
    const body = {
      title: val.title,
      description: val.description || null,
      target_date: val.target_date || null,
      status: val.status
    };

    if (this.editingId) {
      this.api.updateBucketListItem(this.editingId, body).subscribe({
        next: () => {
          this.snackBar.open('Item updated successfully', 'Dismiss', { duration: 3000 });
          this.closeForm();
          this.loadBucketList();
        },
        error: (err) => {
          const msg = err.error?.message || 'Error updating item';
          this.snackBar.open(msg, 'Dismiss', { duration: 5000 });
        }
      });
    } else {
      this.api.addBucketListItem(body).subscribe({
        next: () => {
          this.snackBar.open('Item added to bucket list', 'Dismiss', { duration: 3000 });
          this.closeForm();
          this.loadBucketList();
        },
        error: (err) => {
          const msg = err.error?.message || 'Error adding item';
          this.snackBar.open(msg, 'Dismiss', { duration: 5000 });
        }
      });
    }
  }

  deleteItem(id: number) {
    if (confirm('Are you sure you want to delete this item from your bucket list?')) {
      this.api.deleteBucketListItem(id).subscribe({
        next: () => {
          this.snackBar.open('Item deleted', 'Dismiss', { duration: 3000 });
          this.loadBucketList();
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Error deleting item', 'Dismiss', { duration: 5000 });
        }
      });
    }
  }
}
