package com.barakann.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "part_included_items")
public class PartIncludedItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "part_id", nullable = false)
    private Part part;

    // 表示用の付属品・構成品名
    @Column(name = "item_name", nullable = false, length = 150)
    private String itemName;

    @Column(nullable = false)
    private Integer quantity = 1;

    // カテゴリーが設定されている場合、そのカテゴリーの単品選択を不要にする
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "included_category_id")
    private Category includedCategory;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public PartIncludedItem() {
    }

    public PartIncludedItem(
            Part part,
            String itemName,
            Integer quantity,
            Category includedCategory
    ) {
        this.part = part;
        this.itemName = itemName;
        this.quantity = quantity;
        this.includedCategory = includedCategory;
    }

    public void setPart(Part part) {
        this.part = part;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public void setIncludedCategory(Category includedCategory) {
        this.includedCategory = includedCategory;
    }

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
