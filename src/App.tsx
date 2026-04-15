import { ChangeEvent, ClipboardEvent, DragEvent, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  Alert,
  Autocomplete,
  AppBar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Popover,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { alpha, darken, lighten, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Filter, LogIn, LogOut, MessageCircleMore, ThumbsDown, ThumbsUp } from "lucide-react";
import { City, Country, type ICity, type ICountry } from "country-state-city";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

type UploadResult = {
  storageId: Id<"_storage">;
};

type ThemeColors = {
  brandColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
};

type AppProps = {
  defaultThemeColors: ThemeColors;
};

type LocationOption = {
  code: string;
  name: string;
};

const HEX_COLOR_PATTERN = /^#([0-9A-F]{6})$/;
const ADMIN_SESSION_STORAGE_KEY = "jayden-gallery-admin-session";
const PUBLIC_VISITOR_ID_STORAGE_KEY = "jayden-gallery-public-visitor-id";

const normalizeHexColor = (value: string) => value.trim().toUpperCase();
const normalizeCategoryValue = (value: string) => value.trim();
const sortByName = (left: LocationOption, right: LocationOption) => left.name.localeCompare(right.name);
const mimeTypeToExtension = (mimeType: string) => {
  const subtype = mimeType.split("/")[1] ?? "png";

  if (subtype === "jpeg") {
    return "jpg";
  }

  if (subtype === "svg+xml") {
    return "svg";
  }

  return subtype;
};
const extractImageFileFromClipboardData = (clipboardData: DataTransfer | null) => {
  if (!clipboardData) {
    return null;
  }

  for (const item of Array.from(clipboardData.items)) {
    if (!item.type.startsWith("image/")) {
      continue;
    }

    const file = item.getAsFile();

    if (file) {
      return file;
    }
  }

  return null;
};

const mapCountryOption = (country: ICountry): LocationOption => ({
  code: country.isoCode,
  name: country.name,
});

const mapCityOption = (city: ICity): LocationOption => ({
  code: `${city.countryCode}-${city.stateCode}-${city.name}`,
  name: city.name,
});

export default function App({ defaultThemeColors }: AppProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const pageSize = isMobile ? 3 : 6;
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [visitorId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const existingVisitorId = window.localStorage.getItem(PUBLIC_VISITOR_ID_STORAGE_KEY);

    if (existingVisitorId) {
      return existingVisitorId;
    }

    const nextVisitorId = crypto.randomUUID();
    window.localStorage.setItem(PUBLIC_VISITOR_ID_STORAGE_KEY, nextVisitorId);
    return nextVisitorId;
  });
  const {
    results: images,
    status: imagesStatus,
    loadMore: loadMoreImages,
  } = usePaginatedQuery(api.gallery.listImagesPaginated, {
    category: selectedCategoryFilter,
    visitorId,
  }, {
    initialNumItems: pageSize,
  });
  const categories = useQuery(api.gallery.listCategories);
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
  });
  const authState = useQuery(api.gallery.getAuthState, { sessionToken });
  const logIn = useMutation(api.gallery.logIn);
  const logOut = useMutation(api.gallery.logOut);
  const generateUploadUrl = useMutation(api.gallery.generateUploadUrl);
  const createImageEntry = useMutation(api.gallery.createImageEntry);
  const updateImageEntry = useMutation(api.gallery.updateImageEntry);
  const saveThemeSettings = useMutation(api.gallery.saveThemeSettings);
  const addImageComment = useMutation(api.gallery.addImageComment);
  const setImageReaction = useMutation(api.gallery.setImageReaction);
  const notifyImageInteraction = useMutation(api.gallery.notifyImageInteraction);

  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [authErrorMessage, setAuthErrorMessage] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isThemeDialogOpen, setIsThemeDialogOpen] = useState(false);
  const [editingImageId, setEditingImageId] = useState<Id<"images"> | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<LocationOption | null>(null);
  const [selectedCity, setSelectedCity] = useState<LocationOption | null>(null);
  const [streetAddress, setStreetAddress] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editCountry, setEditCountry] = useState<LocationOption | null>(null);
  const [editCity, setEditCity] = useState<LocationOption | null>(null);
  const [editStreetAddress, setEditStreetAddress] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isPastingPhoto, setIsPastingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editErrorMessage, setEditErrorMessage] = useState("");
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [brandColorInput, setBrandColorInput] = useState(defaultThemeColors.brandColor);
  const [secondaryColorInput, setSecondaryColorInput] = useState(defaultThemeColors.secondaryColor);
  const [accentColorInput, setAccentColorInput] = useState(defaultThemeColors.accentColor);
  const [textColorInput, setTextColorInput] = useState(defaultThemeColors.textColor);
  const [themeErrorMessage, setThemeErrorMessage] = useState("");
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [commentAuthorName, setCommentAuthorName] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [commentErrorMessage, setCommentErrorMessage] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [shouldScrollToComments, setShouldScrollToComments] = useState(false);
  const [reactionErrorMessage, setReactionErrorMessage] = useState("");
  const [pendingReactionImageId, setPendingReactionImageId] = useState<Id<"images"> | null>(null);
  const commentsSectionRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isThemeDialogOpen) {
      setBrandColorInput(defaultThemeColors.brandColor);
      setSecondaryColorInput(defaultThemeColors.secondaryColor);
      setAccentColorInput(defaultThemeColors.accentColor);
      setTextColorInput(defaultThemeColors.textColor);
      setThemeErrorMessage("");
    }
  }, [defaultThemeColors, isThemeDialogOpen]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const countryOptions = useMemo(
    () => Country.getAllCountries().map(mapCountryOption).sort(sortByName),
    [],
  );
  const cityOptions = useMemo(() => {
    if (!selectedCountry) {
      return [];
    }

    const uniqueCities = new Map<string, LocationOption>();

    for (const city of City.getCitiesOfCountry(selectedCountry.code) ?? []) {
      const key = city.name.trim().toLowerCase();

      if (!key || uniqueCities.has(key)) {
        continue;
      }

      uniqueCities.set(key, mapCityOption(city));
    }

    return Array.from(uniqueCities.values()).sort(sortByName);
  }, [selectedCountry]);
  const editCityOptions = useMemo(() => {
    if (!editCountry) {
      return [];
    }

    const uniqueCities = new Map<string, LocationOption>();

    for (const city of City.getCitiesOfCountry(editCountry.code) ?? []) {
      const key = city.name.trim().toLowerCase();

      if (!key || uniqueCities.has(key)) {
        continue;
      }

      uniqueCities.set(key, mapCityOption(city));
    }

    return Array.from(uniqueCities.values()).sort(sortByName);
  }, [editCountry]);

  useEffect(() => {
    if (selectedCity && !cityOptions.some((cityOption) => cityOption.name === selectedCity.name)) {
      setSelectedCity(null);
    }
  }, [cityOptions, selectedCity]);

  useEffect(() => {
    if (!editCity) {
      return;
    }

    const matchingCity = editCityOptions.find((cityOption) => cityOption.name === editCity.name);

    if (!matchingCity) {
      setEditCity(null);
      return;
    }

    if (matchingCity.code !== editCity.code) {
      setEditCity(matchingCity);
    }
  }, [editCity, editCityOptions]);

  const isFormValid = Boolean(
    selectedCategory.trim() !== "" &&
    title.trim() !== "" &&
      caption.trim() !== "" &&
      selectedFile &&
      selectedCountry?.name &&
      selectedCity?.name,
  );
  const helperText = useMemo(() => {
    if (selectedFile) {
      return `Selected image: ${selectedFile.name}`;
    }

    return "Choose an image file to add to the gallery.";
  }, [selectedFile]);
  const currentThemeColors = defaultThemeColors;
  const previewBrandColor = HEX_COLOR_PATTERN.test(brandColorInput)
    ? brandColorInput
    : currentThemeColors.brandColor;
  const previewSecondaryColor = HEX_COLOR_PATTERN.test(secondaryColorInput)
    ? secondaryColorInput
    : currentThemeColors.secondaryColor;
  const previewAccentColor = HEX_COLOR_PATTERN.test(accentColorInput)
    ? accentColorInput
    : currentThemeColors.accentColor;
  const previewTextColor = HEX_COLOR_PATTERN.test(textColorInput)
    ? textColorInput
    : currentThemeColors.textColor;
  const isEditFormValid = Boolean(
    editCategory.trim() !== "" &&
    editTitle.trim() !== "" &&
      editCaption.trim() !== "" &&
      editCountry?.name &&
      editCity?.name,
  );
  const isAuthenticated = authState?.isAuthenticated ?? false;
  const categoryOptions = useMemo(() => categories ?? [], [categories]);
  const filteredImages = useMemo(() => {
    if (!images) {
      return [];
    }

    return images.filter((image) => {
      const matchesCountry = !countryFilter || image.country === countryFilter;
      const matchesCity = !cityFilter || image.city === cityFilter;

      return matchesCountry && matchesCity;
    });
  }, [cityFilter, countryFilter, images]);
  const countryFilterOptions = useMemo(
    () =>
      Array.from(new Set((images ?? []).map((image) => image.country).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right),
      ),
    [images],
  );
  const cityFilterOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (images ?? [])
            .filter((image) => !countryFilter || image.country === countryFilter)
            .map((image) => image.city)
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [countryFilter, images],
  );
  const categoryTabs = useMemo(
    () => [{ label: "All", value: "__all__" }, ...categoryOptions.map((category) => ({ label: category, value: category }))],
    [categoryOptions],
  );

  const clearSession = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    }

    setSessionToken(null);
  };

  const storeSession = (nextSessionToken: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, nextSessionToken);
    }

    setSessionToken(nextSessionToken);
  };

  const openLoginDialog = () => {
    setAuthErrorMessage("");
    setPassword("");
    setIsAuthDialogOpen(true);
  };

  const requireSessionToken = () => {
    const token = sessionToken?.trim();

    if (!token) {
      clearSession();
      openLoginDialog();
      throw new Error("Please log in to continue.");
    }

    return token;
  };

  const handleProtectedActionError = (error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;

    if (
      message.includes("log in") ||
      message.includes("session has expired") ||
      message.includes("Please log in")
    ) {
      clearSession();
      setIsDialogOpen(false);
      setIsThemeDialogOpen(false);
      handleEditDialogClose();
      openLoginDialog();
    }

    return message;
  };

  const resetForm = () => {
    setSelectedCategory("");
    setTitle("");
    setCaption("");
    setSelectedCountry(null);
    setSelectedCity(null);
    setStreetAddress("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsDragActive(false);
    setErrorMessage("");
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleThemeDialogClose = () => {
    if (isSavingTheme) {
      return;
    }

    setIsThemeDialogOpen(false);
    setBrandColorInput(defaultThemeColors.brandColor);
    setSecondaryColorInput(defaultThemeColors.secondaryColor);
    setAccentColorInput(defaultThemeColors.accentColor);
    setTextColorInput(defaultThemeColors.textColor);
    setThemeErrorMessage("");
  };

  const handleEditDialogClose = () => {
    if (isSavingEdit) {
      return;
    }

    setIsSavingEdit(false);
    setEditingImageId(null);
    setEditCategory("");
    setEditTitle("");
    setEditCaption("");
    setEditCountry(null);
    setEditCity(null);
    setEditStreetAddress("");
    setEditErrorMessage("");
  };

  const handleSelectedFile = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please drop or select an image file.");
      return;
    }

    setSelectedFile(file);
    setErrorMessage("");
  };

  const handleEditOpen = (image: NonNullable<typeof images>[number]) => {
    const matchingCountry =
      countryOptions.find((countryOption) => countryOption.name === image.country) ??
      (image.country ? { code: image.country, name: image.country } : null);

    setEditingImageId(image._id);
    setEditCategory(image.category ?? "");
    setEditTitle(image.title);
    setEditCaption(image.caption);
    setEditCountry(matchingCountry);
    setEditCity(image.city ? { code: image.city, name: image.city } : null);
    setEditStreetAddress(image.streetAddress ?? "");
    setEditErrorMessage("");
  };

  const handleViewerClose = () => {
    setActiveImageIndex(null);
  };

  const handleViewerOpen = (index: number, options?: { scrollToComments?: boolean }) => {
    setActiveImageIndex(index);
    setShouldScrollToComments(Boolean(options?.scrollToComments));
  };

  const handleViewerStep = (direction: "previous" | "next") => {
    if (!filteredImages.length) {
      return;
    }

    setActiveImageIndex((currentIndex) => {
      if (currentIndex === null) {
        return currentIndex;
      }

      if (direction === "previous") {
        return (currentIndex - 1 + filteredImages.length) % filteredImages.length;
      }

      return (currentIndex + 1) % filteredImages.length;
    });
  };
  const handleViewerStepEvent = useEffectEvent((direction: "previous" | "next") => {
    handleViewerStep(direction);
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    handleSelectedFile(file);
    event.target.value = "";
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    handleSelectedFile(file);
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const file = extractImageFileFromClipboardData(event.clipboardData);

    if (!file) {
      return;
    }

    event.preventDefault();
    handleSelectedFile(file);
  };

  const handlePasteButtonClick = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.read) {
      setErrorMessage("Clipboard paste button is not supported here. Click the upload area and press Ctrl+V instead.");
      return;
    }

    setIsPastingPhoto(true);
    setErrorMessage("");

    try {
      const clipboardItems = await navigator.clipboard.read();

      for (const clipboardItem of clipboardItems) {
        const imageType = clipboardItem.types.find((type) => type.startsWith("image/"));

        if (!imageType) {
          continue;
        }

        const blob = await clipboardItem.getType(imageType);
        const file = new File([blob], `pasted-photo.${mimeTypeToExtension(imageType)}`, {
          type: imageType,
          lastModified: Date.now(),
        });

        handleSelectedFile(file);
        return;
      }

      setErrorMessage("No photo found in your clipboard. Copy an image first, then try Paste Photo.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not read the clipboard. You can still click the upload area and press Ctrl+V.",
      );
    } finally {
      setIsPastingPhoto(false);
    }
  };

  useEffect(() => {
    if (cityFilter && !cityFilterOptions.includes(cityFilter)) {
      setCityFilter(null);
    }
  }, [cityFilter, cityFilterOptions]);

  const handleThemeColorChange = (key: keyof ThemeColors, value: string) => {
    const normalized = normalizeHexColor(value);

    if (key === "brandColor") {
      setBrandColorInput(normalized);
    }

    if (key === "secondaryColor") {
      setSecondaryColorInput(normalized);
    }

    if (key === "accentColor") {
      setAccentColorInput(normalized);
    }

    if (key === "textColor") {
      setTextColorInput(normalized);
    }

    setThemeErrorMessage("");
  };

  const handleThemeSave = async () => {
    let activeSessionToken: string;

    try {
      activeSessionToken = requireSessionToken();
    } catch (error) {
      setThemeErrorMessage(handleProtectedActionError(error, "Please log in to continue."));
      return;
    }

    const normalizedBrandColor = normalizeHexColor(brandColorInput);
    const normalizedSecondaryColor = normalizeHexColor(secondaryColorInput);
    const normalizedAccentColor = normalizeHexColor(accentColorInput);
    const normalizedTextColor = normalizeHexColor(textColorInput);

    if (
      !HEX_COLOR_PATTERN.test(normalizedBrandColor) ||
      !HEX_COLOR_PATTERN.test(normalizedSecondaryColor) ||
      !HEX_COLOR_PATTERN.test(normalizedAccentColor) ||
      !HEX_COLOR_PATTERN.test(normalizedTextColor)
    ) {
      setThemeErrorMessage("Enter four full 6-digit hex colors like #6B7280.");
      return;
    }

    setIsSavingTheme(true);
    setThemeErrorMessage("");

    try {
      await saveThemeSettings({
        sessionToken: activeSessionToken,
        brandColor: normalizedBrandColor,
        secondaryColor: normalizedSecondaryColor,
        accentColor: normalizedAccentColor,
        textColor: normalizedTextColor,
      });
      setIsThemeDialogOpen(false);
    } catch (error) {
      setThemeErrorMessage(
        handleProtectedActionError(error, "Unable to save the theme colors right now."),
      );
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleSubmit = async () => {
    let activeSessionToken: string;

    try {
      activeSessionToken = requireSessionToken();
    } catch (error) {
      setErrorMessage(handleProtectedActionError(error, "Please log in to continue."));
      return;
    }

    if (!selectedFile) {
      setErrorMessage("Please choose an image before uploading.");
      return;
    }

    if (!title.trim() || !caption.trim() || !selectedCountry?.name || !selectedCity?.name) {
      setErrorMessage("Please add a category, title, caption, country, and city.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const uploadUrl = await generateUploadUrl({ sessionToken: activeSessionToken });
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": selectedFile.type || "application/octet-stream",
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Image upload failed.");
      }

      const { storageId } = (await uploadResponse.json()) as UploadResult;

      await createImageEntry({
        sessionToken: activeSessionToken,
        storageId,
        category: normalizeCategoryValue(selectedCategory),
        title,
        caption,
        country: selectedCountry.name,
        city: selectedCity.name,
        streetAddress: streetAddress.trim() || undefined,
      });

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      setErrorMessage(handleProtectedActionError(error, "Something went wrong while uploading the image."));
      setIsSubmitting(false);
    }
  };

  const handleEditSave = async () => {
    let activeSessionToken: string;

    try {
      activeSessionToken = requireSessionToken();
    } catch (error) {
      setEditErrorMessage(handleProtectedActionError(error, "Please log in to continue."));
      return;
    }

    if (!editingImageId) {
      return;
    }

    if (!editCategory.trim() || !editTitle.trim() || !editCaption.trim() || !editCountry?.name || !editCity?.name) {
      setEditErrorMessage("Please update the category, title, caption, country, and city.");
      return;
    }

    setIsSavingEdit(true);
    setEditErrorMessage("");

    try {
      await updateImageEntry({
        sessionToken: activeSessionToken,
        imageId: editingImageId,
        category: normalizeCategoryValue(editCategory),
        title: editTitle,
        caption: editCaption,
        country: editCountry.name,
        city: editCity.name,
        streetAddress: editStreetAddress.trim() || undefined,
      });

      setIsSavingEdit(false);
      setEditingImageId(null);
      setEditCategory("");
      setEditTitle("");
      setEditCaption("");
      setEditStreetAddress("");
      setEditErrorMessage("");
    } catch (error) {
      setEditErrorMessage(
        handleProtectedActionError(error, "Something went wrong while saving your changes."),
      );
      setIsSavingEdit(false);
    }
  };

  const handleLoginClose = () => {
    if (isAuthenticating) {
      return;
    }

    setIsAuthDialogOpen(false);
    setPassword("");
    setAuthErrorMessage("");
  };

  const handleLoginSubmit = async () => {
    if (!password.trim()) {
      setAuthErrorMessage("Please enter the password.");
      return;
    }

    setIsAuthenticating(true);
    setAuthErrorMessage("");

    try {
      const result = await logIn({ password });
      storeSession(result.sessionToken);
      setPassword("");
      setIsAuthDialogOpen(false);
    } catch (error) {
      setAuthErrorMessage(error instanceof Error ? error.message : "Unable to log in right now.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    const token = sessionToken?.trim();

    clearSession();
    setIsDialogOpen(false);
    setIsThemeDialogOpen(false);
    handleEditDialogClose();

    if (!token) {
      return;
    }

    try {
      await logOut({ sessionToken: token });
    } catch {
      // Ignore logout cleanup errors because the local session is already cleared.
    }
  };

  useEffect(() => {
    if (authState !== null && authState !== undefined && !authState.isAuthenticated && sessionToken) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      }

      setSessionToken(null);
    }
  }, [authState, sessionToken]);

  useEffect(() => {
    if (!filteredImages.length) {
      setActiveImageIndex(null);
      return;
    }

    setActiveImageIndex((currentIndex) => {
      if (currentIndex === null) {
        return currentIndex;
      }

      return Math.min(currentIndex, filteredImages.length - 1);
    });
  }, [filteredImages]);

  useEffect(() => {
    if (activeImageIndex === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleViewerStepEvent("previous");
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleViewerStepEvent("next");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeImageIndex, filteredImages]);

  const activeImage =
    activeImageIndex !== null && filteredImages[activeImageIndex]
      ? filteredImages[activeImageIndex]
      : null;
  const activeImageComments = useQuery(
    api.gallery.listImageComments,
    activeImage ? { imageId: activeImage._id } : "skip",
  );
  const isFilterOpen = Boolean(filterAnchorEl);
  const isCommentFormValid = Boolean(commentAuthorName.trim() && commentBody.trim());

  useEffect(() => {
    setCommentAuthorName("");
    setCommentBody("");
    setCommentErrorMessage("");
    setIsSubmittingComment(false);
    setReactionErrorMessage("");
  }, [activeImage?._id]);

  useEffect(() => {
    const loadMoreTarget = loadMoreTriggerRef.current;

    if (!loadMoreTarget || imagesStatus !== "CanLoadMore") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (!entry?.isIntersecting) {
          return;
        }

        loadMoreImages(pageSize);
      },
      {
        rootMargin: "240px 0px",
      },
    );

    observer.observe(loadMoreTarget);

    return () => {
      observer.disconnect();
    };
  }, [imagesStatus, loadMoreImages, pageSize, filteredImages.length]);

  useEffect(() => {
    if (!activeImage || !shouldScrollToComments) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      commentsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setShouldScrollToComments(false);
    }, 120);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeImage, shouldScrollToComments]);

  const handleCommentSubmit = async () => {
    if (!activeImage) {
      return;
    }

    if (!commentAuthorName.trim() || !commentBody.trim()) {
      setCommentErrorMessage("Please add your name and a comment.");
      return;
    }

    setIsSubmittingComment(true);
    setCommentErrorMessage("");

    try {
      await addImageComment({
        imageId: activeImage._id,
        authorName: commentAuthorName,
        body: commentBody,
      });
      setCommentAuthorName("");
      setCommentBody("");
    } catch (error) {
      setCommentErrorMessage(
        error instanceof Error ? error.message : "Unable to post your comment right now.",
      );
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCommentOpen = async (imageId: Id<"images">) => {
    try {
      await notifyImageInteraction({
        imageId,
        interaction: "comment_opened",
      });
    } catch {
      // Ignore notification failures so opening comments still works.
    }
  };

  const handleReactionSubmit = async (
    imageId: Id<"images">,
    currentReaction: "like" | "dislike" | null,
    nextReaction: "like" | "dislike",
  ) => {
    if (!visitorId) {
      setReactionErrorMessage("Unable to save your reaction right now.");
      return;
    }

    setPendingReactionImageId(imageId);
    setReactionErrorMessage("");

    try {
      await setImageReaction({
        imageId,
        visitorId,
        value: currentReaction === nextReaction ? null : nextReaction,
      });
    } catch (error) {
      setReactionErrorMessage(
        error instanceof Error ? error.message : "Unable to save your reaction right now.",
      );
    } finally {
      setPendingReactionImageId(null);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: [
          `radial-gradient(circle at 12% 18%, ${alpha(theme.palette.primary.light, 0.52)}, transparent 0 26%)`,
          `radial-gradient(circle at 88% 12%, ${alpha(theme.palette.secondary.main, 0.2)}, transparent 0 24%)`,
          `radial-gradient(circle at 55% 88%, ${alpha(theme.palette.info.main, 0.14)}, transparent 0 26%)`,
          `linear-gradient(180deg, ${lighten(currentThemeColors.secondaryColor, 0.82)} 0%, ${theme.palette.background.default} 34%, ${lighten(currentThemeColors.accentColor, 0.8)} 100%)`,
        ].join(", "),
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: "4% auto auto -10%",
          width: 320,
          height: 320,
          borderRadius: "48% 52% 61% 39% / 35% 46% 54% 65%",
          background: `radial-gradient(circle at 30% 30%, ${alpha("#ffffff", 0.7)}, ${alpha(theme.palette.secondary.main, 0.22)} 50%, ${alpha(theme.palette.info.main, 0.08)} 64%, ${alpha(theme.palette.info.main, 0)} 78%)`,
          filter: "blur(6px)",
          pointerEvents: "none",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          right: "-6%",
          bottom: "12%",
          width: 260,
          height: 260,
          borderRadius: "50%",
          border: `1px solid ${alpha("#ffffff", 0.34)}`,
          boxShadow: `0 0 0 22px ${alpha(theme.palette.info.main, 0.12)}`,
          pointerEvents: "none",
        },
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: alpha(lighten(currentThemeColors.brandColor, 0.95), 0.72),
          color: "text.primary",
          backdropFilter: "blur(18px)",
          borderBottom: `1px solid ${alpha(theme.palette.primary.dark, 0.14)}`,
        }}
      >
        <Toolbar sx={{ gap: 2, justifyContent: "space-between", flexWrap: "wrap" }}>
          <Box>
            <Typography variant="h6" sx={{ letterSpacing: "-0.03em", fontWeight: 700 }}>
              Jayden Gallery
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A personal gallery of Jayden&apos;s AI-generated artwork.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            {isAuthenticated ? (
              <>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => {
                      setBrandColorInput(defaultThemeColors.brandColor);
                      setSecondaryColorInput(defaultThemeColors.secondaryColor);
                      setAccentColorInput(defaultThemeColors.accentColor);
                      setTextColorInput(defaultThemeColors.textColor);
                      setThemeErrorMessage("");
                      setIsThemeDialogOpen(true);
                    }}
                    sx={{
                      px: 2.6,
                      py: 1.3,
                      borderWidth: 1.5,
                      backgroundColor: alpha("#ffffff", 0.45),
                    }}
                  >
                    Theme Colors
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setIsDialogOpen(true)}
                    sx={{ px: 3.2, py: 1.3 }}
                  >
                    Upload Image
                  </Button>
                </Stack>
                <IconButton
                  aria-label="Log out"
                  onClick={() => {
                    void handleLogout();
                  }}
                  sx={{
                    border: `1px solid ${alpha(theme.palette.primary.dark, 0.18)}`,
                    backgroundColor: alpha("#ffffff", 0.55),
                  }}
                >
                  <LogOut size={20} strokeWidth={2.1} />
                </IconButton>
              </>
            ) : (
              <IconButton
                aria-label="Log in"
                onClick={openLoginDialog}
                sx={{
                  border: `1px solid ${alpha(theme.palette.primary.dark, 0.18)}`,
                  backgroundColor: alpha("#ffffff", 0.55),
                }}
              >
                <LogIn size={20} strokeWidth={2.1} />
              </IconButton>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={4}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 5 },
              border: `1px solid ${alpha(theme.palette.primary.dark, 0.18)}`,
              background: `linear-gradient(145deg, ${alpha("#ffffff", 0.8)}, ${alpha(theme.palette.primary.light, 0.18)})`,
              boxShadow: `0 24px 60px ${alpha(theme.palette.primary.dark, 0.12)}, inset 0 0 0 1px ${alpha("#ffffff", 0.58)}`,
              backdropFilter: "blur(18px)",
              position: "relative",
              overflow: "hidden",
              "&::after": {
                content: '""',
                position: "absolute",
                top: -40,
                right: -20,
                width: 180,
                height: 180,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${alpha("#ffffff", 0.75)}, ${alpha("#ffffff", 0)} 70%)`,
              },
            }}
          >
            <Stack
              spacing={2.5}
              sx={{
                position: "relative",
                zIndex: 1,
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <Typography
                variant="overline"
                sx={{ color: "primary.dark", letterSpacing: "0.24em", fontWeight: 800 }}
              >
                Jayden&apos;s Art World
              </Typography>
              <Typography
                variant="h2"
                sx={{ fontSize: { xs: "2.8rem", md: "4.6rem" }, maxWidth: 920 }}
              >
                Jayden&apos;s Gallery
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ maxWidth: 760, lineHeight: 1.65 }}
              >
                This gallery is a collection of Jayden&apos;s artwork made with AI, brought
                together in one dreamy archive. Every image holds a different mood, idea,
                and little piece of the world Jayden is building.
              </Typography>
            </Stack>
          </Paper>

          {imagesStatus === "LoadingFirstPage" ? (
            <Stack spacing={2} sx={{ py: 10, alignItems: "center" }}>
              <CircularProgress color="primary" />
              <Typography color="text.secondary">Loading your gallery...</Typography>
            </Stack>
          ) : images.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: "center",
                borderStyle: "dashed",
                borderWidth: 1.5,
                borderColor: alpha(theme.palette.primary.dark, 0.32),
                backgroundColor: alpha("#ffffff", 0.82),
                boxShadow: `inset 0 0 0 1px ${alpha("#ffffff", 0.5)}`,
              }}
            >
              <Typography variant="h4" gutterBottom>
                Your gallery is ready.
              </Typography>
              <Typography color="text.secondary">
                {isAuthenticated
                  ? "Use the upload button at the top to add the first image with a title and caption."
                  : "Use the login button in the top right to unlock uploads, edits, and theme controls."}
              </Typography>
            </Paper>
          ) : filteredImages.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: "center",
                borderStyle: "dashed",
                borderWidth: 1.5,
                borderColor: alpha(theme.palette.primary.dark, 0.32),
                backgroundColor: alpha("#ffffff", 0.82),
                boxShadow: `inset 0 0 0 1px ${alpha("#ffffff", 0.5)}`,
              }}
            >
              <Typography variant="h4" gutterBottom>
                No images match this view yet.
              </Typography>
              <Typography color="text.secondary">
                Try another category tab or adjust the location filters to see more artwork.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2.5}>
              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={2}
                sx={{ alignItems: { lg: "center" }, justifyContent: "space-between" }}
              >
                <Box
                  sx={{
                    minWidth: 0,
                    flex: 1,
                    border: `1px solid ${alpha(theme.palette.primary.dark, 0.14)}`,
                    backgroundColor: alpha("#ffffff", 0.54),
                    boxShadow: `inset 0 0 0 1px ${alpha("#ffffff", 0.42)}`,
                  }}
                >
                  <Tabs
                    value={selectedCategoryFilter ?? "__all__"}
                    onChange={(_, value: string) => {
                      setSelectedCategoryFilter(value === "__all__" ? null : value);
                      setCountryFilter(null);
                      setCityFilter(null);
                    }}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="Gallery categories"
                    sx={{
                      minHeight: 0,
                      "& .MuiTabs-indicator": {
                        height: 3,
                      },
                      "& .MuiTab-root": {
                        minHeight: 0,
                        px: 2.5,
                        py: 1.75,
                        fontWeight: 700,
                        letterSpacing: "0.01em",
                      },
                    }}
                  >
                    {categoryTabs.map((categoryTab) => (
                      <Tab
                        key={categoryTab.value}
                        label={categoryTab.label}
                        value={categoryTab.value}
                      />
                    ))}
                  </Tabs>
                </Box>
                <IconButton
                  aria-label="Filter images"
                  onClick={(event) => setFilterAnchorEl(event.currentTarget)}
                  sx={{
                    alignSelf: { xs: "flex-end", lg: "center" },
                    border: `1px solid ${alpha(theme.palette.primary.dark, 0.18)}`,
                    backgroundColor: alpha("#ffffff", 0.76),
                  }}
                >
                  <Filter size={18} strokeWidth={2.1} />
                </IconButton>
              </Stack>
              <Box
                sx={{
                  display: "grid",
                  gap: 3,
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                    lg: "repeat(3, minmax(0, 1fr))",
                  },
                }}
              >
                {filteredImages.map((image, index) => (
                  <Card
                    key={image._id}
                    elevation={0}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                      border: `1px solid ${alpha(theme.palette.primary.dark, 0.18)}`,
                      background: `linear-gradient(180deg, ${alpha("#ffffff", 0.84)}, ${alpha(theme.palette.primary.light, 0.2)})`,
                      boxShadow: `0 20px 42px ${alpha(theme.palette.primary.dark, 0.12)}`,
                      borderRadius: 0,
                      transition:
                        "transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease",
                      "&:hover": {
                        transform: "translateY(-6px) rotate(-0.5deg)",
                        boxShadow: `0 24px 56px ${alpha(theme.palette.primary.dark, 0.18)}`,
                        borderColor: alpha(theme.palette.primary.main, 0.34),
                      },
                    }}
                  >
                    <CardActionArea onClick={() => handleViewerOpen(index)}>
                      {image.imageUrl ? (
                        <CardMedia
                          component="img"
                          image={image.imageUrl}
                          alt={image.title}
                          sx={{ height: 260, objectFit: "cover" }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 260,
                            display: "grid",
                            placeItems: "center",
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                          }}
                        >
                          <Typography color="text.secondary">Image unavailable</Typography>
                        </Box>
                      )}
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Stack spacing={1.5}>
                          {image.category ? (
                            <Chip
                              label={image.category}
                              color="primary"
                              variant="filled"
                              sx={{ alignSelf: "flex-start" }}
                            />
                          ) : null}
                          <Typography variant="h5">{image.title}</Typography>
                          <Typography variant="body1" color="text.secondary">
                            {image.caption}
                          </Typography>
                          {image.country || image.city || image.streetAddress ? (
                            <Chip
                              label={[image.streetAddress, image.city, image.country].filter(Boolean).join(", ")}
                              variant="outlined"
                              color="primary"
                              sx={{ alignSelf: "flex-start" }}
                            />
                          ) : null}
                          <Typography variant="caption" color="text.secondary">
                            {new Intl.DateTimeFormat("en-US", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(image._creationTime))}
                          </Typography>
                          <Box
                            sx={{
                              width: 56,
                              height: 5,
                              borderRadius: 0,
                              background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.light})`,
                            }}
                          />
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                    <Stack spacing={1.25} sx={{ px: 2, pb: 2 }}>
                      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                        <Chip
                          icon={<MessageCircleMore size={16} />}
                          label={`${image.commentCount} ${image.commentCount === 1 ? "comment" : "comments"}`}
                          variant="outlined"
                          color="primary"
                          clickable={!isAuthenticated}
                          onClick={
                            !isAuthenticated
                              ? () => {
                                  handleViewerOpen(index, { scrollToComments: true });
                                  void handleCommentOpen(image._id);
                                }
                              : undefined
                          }
                          disabled={isAuthenticated}
                          sx={{ backgroundColor: alpha("#ffffff", 0.48) }}
                        />
                        <Chip
                          icon={<ThumbsUp size={16} />}
                          label={image.likeCount}
                          variant={image.viewerReaction === "like" ? "filled" : "outlined"}
                          color="primary"
                          clickable={!isAuthenticated}
                          onClick={
                            !isAuthenticated
                              ? () => {
                                  void handleReactionSubmit(image._id, image.viewerReaction, "like");
                                }
                              : undefined
                          }
                          disabled={isAuthenticated || pendingReactionImageId === image._id}
                          sx={{ backgroundColor: alpha("#ffffff", 0.48) }}
                        />
                        <Chip
                          icon={<ThumbsDown size={16} />}
                          label={image.dislikeCount}
                          variant={image.viewerReaction === "dislike" ? "filled" : "outlined"}
                          color="primary"
                          clickable={!isAuthenticated}
                          onClick={
                            !isAuthenticated
                              ? () => {
                                  void handleReactionSubmit(image._id, image.viewerReaction, "dislike");
                                }
                              : undefined
                          }
                          disabled={isAuthenticated || pendingReactionImageId === image._id}
                          sx={{ backgroundColor: alpha("#ffffff", 0.48) }}
                        />
                      </Stack>
                      {isAuthenticated ? (
                        <Box>
                          <Button
                            variant="outlined"
                            color="primary"
                            onClick={() => handleEditOpen(image)}
                            sx={{
                              minHeight: 44,
                              px: 1.25,
                              borderWidth: 1.5,
                              backgroundColor: alpha("#ffffff", 0.46),
                            }}
                          >
                            Edit
                          </Button>
                        </Box>
                      ) : null}
                    </Stack>
                  </Card>
                ))}
              </Box>
              <Box ref={loadMoreTriggerRef} sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                {imagesStatus === "LoadingMore" ? <CircularProgress size={28} /> : null}
              </Box>
            </Stack>
          )}
        </Stack>
      </Container>

      <Popover
        open={isFilterOpen}
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              p: 2.25,
              width: { xs: "calc(100vw - 32px)", sm: 380 },
              maxWidth: "calc(100vw - 32px)",
              borderRadius: 0,
              border: `1px solid ${alpha(theme.palette.primary.dark, 0.18)}`,
              background: `linear-gradient(180deg, ${alpha("#ffffff", 0.97)}, ${alpha(lighten(currentThemeColors.secondaryColor, 0.84), 0.95)} 54%, ${alpha(lighten(currentThemeColors.accentColor, 0.86), 0.94)})`,
              boxShadow: `0 20px 42px ${alpha(theme.palette.primary.dark, 0.12)}`,
            },
          },
        }}
      >
        <Stack spacing={2}>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Box>
              <Typography variant="h6">Filter Gallery</Typography>
              <Typography variant="body2" color="text.secondary">
                Choose a country or city.
              </Typography>
            </Box>
            {(countryFilter || cityFilter) ? (
              <Button
                variant="text"
                onClick={() => {
                  setCountryFilter(null);
                  setCityFilter(null);
                }}
              >
                Clear
              </Button>
            ) : null}
          </Stack>
          <Stack spacing={1.25}>
            <Typography variant="subtitle2" color="text.secondary">
              Countries
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              {countryFilterOptions.map((country) => (
                <Chip
                  key={country}
                  label={country}
                  clickable
                  color={countryFilter === country ? "primary" : "default"}
                  variant={countryFilter === country ? "filled" : "outlined"}
                  onClick={() => {
                    setCountryFilter((currentCountry) =>
                      currentCountry === country ? null : country,
                    );
                    setCityFilter(null);
                  }}
                />
              ))}
            </Stack>
          </Stack>
          <Stack spacing={1.25}>
            <Typography variant="subtitle2" color="text.secondary">
              Cities
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              {cityFilterOptions.map((city) => (
                <Chip
                  key={city}
                  label={city}
                  clickable
                  color={cityFilter === city ? "primary" : "default"}
                  variant={cityFilter === city ? "filled" : "outlined"}
                  onClick={() => {
                    setCityFilter((currentCity) => (currentCity === city ? null : city));
                  }}
                />
              ))}
              {cityFilterOptions.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Pick a country to narrow the city list.
                </Typography>
              ) : null}
            </Stack>
          </Stack>
        </Stack>
      </Popover>

      <Dialog
        open={isAuthDialogOpen}
        onClose={handleLoginClose}
        fullWidth
        maxWidth="xs"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              backgroundImage: `linear-gradient(180deg, #ffffff, ${lighten(theme.palette.primary.light, 0.72)})`,
              border: `1.5px solid ${alpha(theme.palette.primary.dark, 0.26)}`,
              overflow: "hidden",
              position: "relative",
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 10,
                borderRadius: 0,
                border: `1px solid ${alpha("#ffffff", 0.6)}`,
                pointerEvents: "none",
              },
            },
          },
          backdrop: {
            sx: {
              backgroundColor: alpha(darken(currentThemeColors.brandColor, 0.7), 0.22),
              backdropFilter: "blur(10px)",
            },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h4">Login</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Enter the gallery password to unlock upload, edit, and theme controls.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {authErrorMessage ? <Alert severity="error">{authErrorMessage}</Alert> : null}
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleLoginSubmit();
                }
              }}
              fullWidth
              required
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleLoginClose} disabled={isAuthenticating}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void handleLoginSubmit()} disabled={isAuthenticating}>
            {isAuthenticating ? "Logging in..." : "Login"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(activeImage)}
        onClose={handleViewerClose}
        fullWidth
        maxWidth="lg"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              overflow: "hidden",
              background: `linear-gradient(180deg, ${alpha("#ffffff", 0.98)}, ${alpha(lighten(currentThemeColors.secondaryColor, 0.82), 0.98)} 58%, ${alpha(lighten(currentThemeColors.accentColor, 0.84), 0.96)})`,
              border: `1.5px solid ${alpha(theme.palette.primary.dark, 0.26)}`,
            },
          },
          backdrop: {
            sx: {
              backgroundColor: alpha(darken(currentThemeColors.brandColor, 0.78), 0.6),
              backdropFilter: "blur(12px)",
            },
          },
        }}
      >
        {activeImage ? (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
              >
                <Box>
                  <Typography variant="h4">{activeImage.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    Swipe through the gallery with the navigation buttons or your keyboard arrow keys.
                  </Typography>
                </Box>
                <Chip
                  label={`${(activeImageIndex ?? 0) + 1} / ${filteredImages.length}`}
                  color="primary"
                  variant="outlined"
                />
              </Stack>
            </DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              <Stack spacing={2.5}>
                <Box
                  sx={{
                    width: "100%",
                    minHeight: { xs: 260, md: 560 },
                    display: "grid",
                    placeItems: "center",
                    background: `linear-gradient(135deg, ${alpha("#ffffff", 0.84)}, ${alpha(theme.palette.primary.light, 0.2)})`,
                    border: `1px solid ${alpha(theme.palette.primary.dark, 0.12)}`,
                    p: { xs: 1, md: 2 },
                  }}
                >
                  {activeImage.imageUrl ? (
                    <Box
                      component="img"
                      src={activeImage.imageUrl}
                      alt={activeImage.title}
                      sx={{
                        width: "100%",
                        maxHeight: { xs: "70vh", md: "75vh" },
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <Typography color="text.secondary">Image unavailable</Typography>
                  )}
                </Box>
                <Stack spacing={1}>
                  {activeImage.category ? (
                    <Chip
                      label={activeImage.category}
                      color="primary"
                      variant="filled"
                      sx={{ alignSelf: "flex-start" }}
                    />
                  ) : null}
                  <Typography variant="h6">About this artwork</Typography>
                  <Typography variant="body1" color="text.secondary">
                    {activeImage.caption}
                  </Typography>
                  {activeImage.country || activeImage.city || activeImage.streetAddress ? (
                    <Chip
                      label={[activeImage.streetAddress, activeImage.city, activeImage.country].filter(Boolean).join(", ")}
                      variant="outlined"
                      color="primary"
                      sx={{ alignSelf: "flex-start" }}
                    />
                  ) : null}
                  <Typography variant="caption" color="text.secondary">
                    {new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(activeImage._creationTime))}
                  </Typography>
                </Stack>
                <Paper
                  ref={commentsSectionRef}
                  elevation={0}
                  sx={{
                    p: { xs: 2, md: 2.5 },
                    border: `1px solid ${alpha(theme.palette.primary.dark, 0.14)}`,
                    backgroundColor: alpha("#ffffff", 0.76),
                  }}
                >
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="h6">Public comments</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        Visitors can leave a short note on each photo.
                      </Typography>
                    </Box>
                    {reactionErrorMessage ? <Alert severity="error">{reactionErrorMessage}</Alert> : null}
                    {!isAuthenticated ? (
                      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                        <Button
                          variant={activeImage.viewerReaction === "like" ? "contained" : "outlined"}
                          color="primary"
                          disabled={pendingReactionImageId === activeImage._id}
                          onClick={() => {
                            void handleReactionSubmit(
                              activeImage._id,
                              activeImage.viewerReaction,
                              "like",
                            );
                          }}
                        >
                          Like ({activeImage.likeCount})
                        </Button>
                        <Button
                          variant={activeImage.viewerReaction === "dislike" ? "contained" : "outlined"}
                          color="primary"
                          disabled={pendingReactionImageId === activeImage._id}
                          onClick={() => {
                            void handleReactionSubmit(
                              activeImage._id,
                              activeImage.viewerReaction,
                              "dislike",
                            );
                          }}
                        >
                          Dislike ({activeImage.dislikeCount})
                        </Button>
                      </Stack>
                    ) : null}
                    {!isAuthenticated ? (
                      <>
                        {commentErrorMessage ? <Alert severity="error">{commentErrorMessage}</Alert> : null}
                        <Stack spacing={1.5}>
                          <TextField
                            label="Your name"
                            value={commentAuthorName}
                            onChange={(event) => {
                              setCommentAuthorName(event.target.value);
                              setCommentErrorMessage("");
                            }}
                            fullWidth
                          />
                          <TextField
                            label="Your comment"
                            value={commentBody}
                            onChange={(event) => {
                              setCommentBody(event.target.value);
                              setCommentErrorMessage("");
                            }}
                            multiline
                            minRows={3}
                            fullWidth
                          />
                          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                            <Button
                              variant="contained"
                              disabled={!isCommentFormValid || isSubmittingComment}
                              onClick={() => {
                                void handleCommentSubmit();
                              }}
                            >
                              {isSubmittingComment ? "Posting..." : "Post Comment"}
                            </Button>
                          </Box>
                        </Stack>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Comment writing is hidden while you are logged in as admin.
                      </Typography>
                    )}
                    <Stack spacing={1.5}>
                      {activeImageComments === undefined ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : activeImageComments.length ? (
                        activeImageComments.map((comment) => (
                          <Paper
                            key={comment._id}
                            elevation={0}
                            sx={{
                              p: 1.75,
                              border: `1px solid ${alpha(theme.palette.primary.dark, 0.1)}`,
                              backgroundColor: alpha(lighten(currentThemeColors.secondaryColor, 0.9), 0.35),
                            }}
                          >
                            <Stack spacing={0.75}>
                              <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={1}
                                sx={{ justifyContent: "space-between" }}
                              >
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  {comment.authorName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Intl.DateTimeFormat("en-US", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  }).format(new Date(comment._creationTime))}
                                </Typography>
                              </Stack>
                              <Typography variant="body2" color="text.secondary">
                                {comment.body}
                              </Typography>
                            </Stack>
                          </Paper>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No comments yet. Be the first to leave one.
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              </Stack>
            </DialogContent>
            <DialogActions
              sx={{
                px: 3,
                pb: 3,
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1.5,
              }}
            >
              <Stack direction="row" spacing={1.5}>
                <Button variant="outlined" onClick={() => handleViewerStep("previous")}>
                  Previous
                </Button>
                <Button variant="contained" onClick={() => handleViewerStep("next")}>
                  Next
                </Button>
              </Stack>
              <Button onClick={handleViewerClose}>Close</Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      <Dialog
        open={isThemeDialogOpen}
        onClose={handleThemeDialogClose}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              backgroundImage: `linear-gradient(180deg, #ffffff, ${lighten(theme.palette.primary.light, 0.72)})`,
              border: `1.5px solid ${alpha(theme.palette.primary.dark, 0.26)}`,
              overflow: "hidden",
              position: "relative",
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 10,
                borderRadius: 0,
                border: `1px solid ${alpha("#ffffff", 0.6)}`,
                pointerEvents: "none",
              },
            },
          },
          backdrop: {
            sx: {
              backgroundColor: alpha(darken(currentThemeColors.brandColor, 0.7), 0.22),
              backdropFilter: "blur(10px)",
            },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h4">Choose your gallery colors</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Pick the main palette plus a text color. The page blends the palette through
            the background and UI, then applies your text color across the whole site.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {themeErrorMessage ? <Alert severity="error">{themeErrorMessage}</Alert> : null}
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{ alignItems: "stretch" }}
            >
              <Paper
                elevation={0}
                sx={{
                  width: "100%",
                  p: 2,
                  border: `1px solid ${alpha(theme.palette.primary.dark, 0.18)}`,
                  backgroundColor: alpha("#ffffff", 0.88),
                }}
              >
                <Stack spacing={2.25}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Palette Controls
                  </Typography>
                  {[
                    {
                      key: "brandColor" as const,
                      label: "Main color",
                      helperText: "Used for the core brand tone and readable structure.",
                      value: brandColorInput,
                      fallback: currentThemeColors.brandColor,
                    },
                    {
                      key: "secondaryColor" as const,
                      label: "Support color",
                      helperText: "Blended into gradients, surfaces, and softer highlights.",
                      value: secondaryColorInput,
                      fallback: currentThemeColors.secondaryColor,
                    },
                    {
                      key: "accentColor" as const,
                      label: "Accent color",
                      helperText: "Used for contrast, motion points, and bright finishing touches.",
                      value: accentColorInput,
                      fallback: currentThemeColors.accentColor,
                    },
                    {
                      key: "textColor" as const,
                      label: "Text color",
                      helperText: "Applied to headings, body copy, and the main readable text across the site.",
                      value: textColorInput,
                      fallback: currentThemeColors.textColor,
                    },
                  ].map((colorField) => (
                    <Paper
                      key={colorField.key}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        border: `1px solid ${alpha(theme.palette.primary.dark, 0.12)}`,
                        backgroundColor: alpha("#ffffff", 0.8),
                      }}
                    >
                      <Stack spacing={1.25}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {colorField.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {colorField.helperText}
                        </Typography>
                        <Box
                          component="input"
                          type="color"
                          aria-label={`Pick ${colorField.label.toLowerCase()}`}
                          value={
                            HEX_COLOR_PATTERN.test(colorField.value)
                              ? colorField.value
                              : colorField.fallback
                          }
                          onChange={(event: ChangeEvent<HTMLInputElement>) => {
                            handleThemeColorChange(colorField.key, event.target.value);
                          }}
                          sx={{
                            width: "100%",
                            minHeight: 76,
                            border: 0,
                            background: "transparent",
                            cursor: "pointer",
                          }}
                        />
                        <TextField
                          label={`${colorField.label} hex`}
                          value={colorField.value}
                          onChange={(event) => {
                            handleThemeColorChange(colorField.key, event.target.value);
                          }}
                          placeholder="#6B7280"
                          fullWidth
                        />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Paper>
              <Paper
                elevation={0}
                sx={{
                  width: { xs: "100%", md: 220 },
                  p: 2,
                  border: `1px solid ${alpha(theme.palette.primary.dark, 0.18)}`,
                  background: `linear-gradient(165deg, ${alpha(previewBrandColor, 0.2)}, ${alpha(previewSecondaryColor, 0.16)} 52%, ${alpha(previewAccentColor, 0.18)})`,
                }}
              >
                <Stack spacing={2}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Combined Preview
                  </Typography>
                  <Box
                    sx={{
                      minHeight: 180,
                      border: `1px solid ${alpha("#ffffff", 0.58)}`,
                      background: [
                        `radial-gradient(circle at 18% 20%, ${alpha(previewSecondaryColor, 0.42)}, transparent 0 34%)`,
                        `radial-gradient(circle at 82% 18%, ${alpha(previewAccentColor, 0.32)}, transparent 0 28%)`,
                        `linear-gradient(145deg, ${lighten(previewBrandColor, 0.82)} 0%, ${lighten(previewSecondaryColor, 0.84)} 54%, ${lighten(previewAccentColor, 0.82)} 100%)`,
                      ].join(", "),
                      p: 2,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      color: previewTextColor,
                    }}
                  >
                    <Stack direction="row" spacing={1}>
                      {[previewBrandColor, previewSecondaryColor, previewAccentColor, previewTextColor].map((color) => (
                        <Box
                          key={color}
                          sx={{
                            width: 24,
                            height: 24,
                            border: `1px solid ${alpha("#ffffff", 0.65)}`,
                            backgroundColor: color,
                          }}
                        />
                      ))}
                    </Stack>
                    <Stack spacing={1.25}>
                      <Typography variant="h6">Jayden Gallery</Typography>
                      <Button variant="contained" size="small" sx={{ alignSelf: "flex-start" }}>
                        Preview Button
                      </Button>
                      <Typography variant="body2" sx={{ color: alpha(previewTextColor, 0.8) }}>
                        Preview text now follows your chosen site text color.
                      </Typography>
                    </Stack>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Tip: choose colors with different jobs so the palette feels layered instead
                    of flat.
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleThemeDialogClose} disabled={isSavingTheme}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void handleThemeSave()} disabled={isSavingTheme}>
            {isSavingTheme ? "Saving..." : "Save Theme"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editingImageId)}
        onClose={handleEditDialogClose}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              backgroundImage: `linear-gradient(180deg, #ffffff, ${lighten(theme.palette.primary.light, 0.72)})`,
              border: `1.5px solid ${alpha(theme.palette.primary.dark, 0.26)}`,
              overflow: "hidden",
              position: "relative",
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 10,
                borderRadius: 0,
                border: `1px solid ${alpha("#ffffff", 0.6)}`,
                pointerEvents: "none",
              },
            },
          },
          backdrop: {
            sx: {
              backgroundColor: alpha(darken(currentThemeColors.brandColor, 0.7), 0.22),
              backdropFilter: "blur(10px)",
            },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h4">Edit image details</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Update the title, caption, and location for this gallery card.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {editErrorMessage ? <Alert severity="error">{editErrorMessage}</Alert> : null}
            <Autocomplete
              freeSolo
              options={categoryOptions}
              value={editCategory}
              onInputChange={(_, value) => setEditCategory(value)}
              onChange={(_, value) => setEditCategory(typeof value === "string" ? value : value ?? "")}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Category"
                  required
                  helperText="Select an existing category or type a new one."
                />
              )}
            />
            <TextField
              label="Title"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Caption"
              value={editCaption}
              onChange={(event) => setEditCaption(event.target.value)}
              multiline
              minRows={4}
              fullWidth
              required
            />
            <Autocomplete
              options={countryOptions}
              value={editCountry}
              isOptionEqualToValue={(option, value) => option.name === value.name}
              getOptionLabel={(option) => option.name}
              onChange={(_, value) => {
                setEditCountry(value);
                setEditCity(null);
              }}
              renderInput={(params) => (
                <TextField {...params} label="Country" required />
              )}
            />
            <Autocomplete
              options={editCityOptions}
              value={editCity}
              disabled={!editCountry}
              isOptionEqualToValue={(option, value) => option.name === value.name}
              getOptionLabel={(option) => option.name}
              onChange={(_, value) => setEditCity(value)}
              renderInput={(params) => <TextField {...params} label="City" required />}
            />
            <TextField
              label="Street Address"
              value={editStreetAddress}
              onChange={(event) => setEditStreetAddress(event.target.value)}
              fullWidth
              helperText="Optional"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleEditDialogClose} disabled={isSavingEdit}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!isEditFormValid || isSavingEdit}
            onClick={() => {
              void handleEditSave();
            }}
          >
            {isSavingEdit ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isDialogOpen}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              backgroundImage: `linear-gradient(180deg, #ffffff, ${lighten(theme.palette.primary.light, 0.72)})`,
              border: `1.5px solid ${alpha(theme.palette.primary.dark, 0.26)}`,
              overflow: "hidden",
              position: "relative",
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 10,
                borderRadius: 0,
                border: `1px solid ${alpha("#ffffff", 0.6)}`,
                pointerEvents: "none",
              },
            },
          },
          backdrop: {
            sx: {
              backgroundColor: alpha(darken(currentThemeColors.brandColor, 0.7), 0.22),
              backdropFilter: "blur(10px)",
            },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h4">Upload an image</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Add a new frame to the gallery with a title, a short caption, and a location.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
            <Paper
              variant="outlined"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onPaste={handlePaste}
              tabIndex={0}
              sx={{
                p: 2,
                borderStyle: "dashed",
                borderWidth: 2,
                borderColor: isDragActive
                  ? theme.palette.primary.main
                  : alpha(theme.palette.primary.dark, 0.24),
                background: isDragActive
                  ? alpha(theme.palette.primary.light, 0.14)
                  : alpha("#ffffff", 0.92),
                transition: "border-color 180ms ease, background-color 180ms ease",
              }}
            >
              <Stack spacing={2} sx={{ alignItems: "center" }}>
                {previewUrl ? (
                  <Box
                    component="img"
                    src={previewUrl}
                    alt={selectedFile?.name ?? "Selected preview"}
                    sx={{
                      width: "100%",
                      maxHeight: 280,
                      objectFit: "cover",
                      borderRadius: 0,
                      border: `1px solid ${alpha(theme.palette.primary.dark, 0.18)}`,
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: "100%",
                      minHeight: 180,
                      display: "grid",
                      placeItems: "center",
                      px: 2,
                      textAlign: "center",
                      background: `linear-gradient(135deg, ${alpha("#ffffff", 0.7)}, ${alpha(theme.palette.primary.light, 0.12)})`,
                    }}
                  >
                    <Stack spacing={1} sx={{ alignItems: "center" }}>
                      <Typography variant="h6">
                        Drag and drop your image here
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        PNG, JPG, WEBP, and other image files are supported.
                      </Typography>
                    </Stack>
                  </Box>
                )}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button
                    variant="outlined"
                    component="label"
                    disabled={isPastingPhoto}
                    sx={{
                      borderColor: alpha(theme.palette.primary.dark, 0.24),
                      backgroundColor: "#ffffff",
                    }}
                  >
                    Select Image
                    <input hidden accept="image/*" type="file" onChange={handleFileChange} />
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      void handlePasteButtonClick();
                    }}
                    disabled={isPastingPhoto}
                    sx={{
                      borderColor: alpha(theme.palette.primary.dark, 0.24),
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {isPastingPhoto ? "Pasting..." : "Paste Photo"}
                  </Button>
                </Stack>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: "center" }}
                >
                  {selectedFile
                    ? `Selected image: ${selectedFile.name}`
                    : "Drop an image here, use Select Image, or click this area and press Ctrl+V."}
                </Typography>
              </Stack>
            </Paper>
            <Typography variant="body2" color="text.secondary">
              {helperText}
            </Typography>
            <Autocomplete
              freeSolo
              options={categoryOptions}
              value={selectedCategory}
              onInputChange={(_, value) => setSelectedCategory(value)}
              onChange={(_, value) =>
                setSelectedCategory(typeof value === "string" ? value : value ?? "")
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Category"
                  required
                  helperText="Select an existing category or type a new one."
                />
              )}
            />
            <TextField
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              multiline
              minRows={4}
              fullWidth
              required
            />
            <Autocomplete
              options={countryOptions}
              value={selectedCountry}
              isOptionEqualToValue={(option, value) => option.name === value.name}
              getOptionLabel={(option) => option.name}
              onChange={(_, value) => {
                setSelectedCountry(value);
                setSelectedCity(null);
              }}
              renderInput={(params) => <TextField {...params} label="Country" required />}
            />
            <Autocomplete
              options={cityOptions}
              value={selectedCity}
              disabled={!selectedCountry}
              isOptionEqualToValue={(option, value) => option.name === value.name}
              getOptionLabel={(option) => option.name}
              onChange={(_, value) => setSelectedCity(value)}
              renderInput={(params) => <TextField {...params} label="City" required />}
            />
            <TextField
              label="Street Address"
              value={streetAddress}
              onChange={(event) => setStreetAddress(event.target.value)}
              fullWidth
              helperText="Optional"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!isFormValid || isSubmitting}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {isSubmitting ? "Uploading..." : "Publish to Gallery"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
