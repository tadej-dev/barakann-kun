package com.example.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "categories")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "key", nullable = false, unique = true)
    private String key;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    public Category() {
    }

    public Category(String key, String displayName) {
        this.key = key;
        this.displayName = displayName;
    }

    public Long getId() {
        return id;
    }

    public String getKey() {
        return key;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }
}